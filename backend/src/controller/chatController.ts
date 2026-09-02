// ==========================================
// FILE: backend/src/controllers/chatController.ts
// ==========================================

import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildTradaraSystemInstruction, ProductContext } from '../ai/prompts/tradaraPromptBuilder';
import { NegotiationEngine, NegotiationRules } from '../services/negotiationEngine';

// Initialize the Gemini SDK client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ChatMessageHistoryItem {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface ChatRequestBody {
  message: string;
  history?: ChatMessageHistoryItem[];
  product?: ProductContext;
  negotiationRules?: Partial<NegotiationRules>;
  currentRound?: number;
}

/**
 * Express Controller handling user interactions with TRADARA AI powered by Gemini.
 */
export const handleAiChat = async (req: Request<{}, {}, ChatRequestBody>, res: Response): Promise<void> => {
  try {
    const { message, history = [], product, negotiationRules, currentRound = 1 } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Message string is required.',
      });
      return;
    }

    const cleanUserMessage = message.trim();

    // Parse potential numeric price offer from user text (e.g., "50k", "₦50,000", "50000")
    let extractedOffer: number | null = null;
    const kMatch = cleanUserMessage.match(/(?:₦|N|NGN|\$)?\s?(\d+(?:\.\d+)?)\s?k\b/i);
    if (kMatch) {
      extractedOffer = parseFloat(kMatch[1]) * 1000;
    } else {
      const priceMatch = cleanUserMessage.match(/(?:₦|N|NGN|\$)?\s?(\d{1,3}(?:,\d{3})+|\d+)/i);
      if (priceMatch && priceMatch[1]) {
        const cleanNum = priceMatch[1].replace(/,/g, '');
        const parsed = parseFloat(cleanNum);
        if (!isNaN(parsed) && parsed > 0) {
          extractedOffer = parsed;
        }
      }
    }

    let processedProduct: ProductContext | undefined = undefined;
    let negotiationResult: any = null;

    if (product && product.listPrice) {
      const listPrice = Number(product.listPrice);
      // Strict minimum price calculation: default to 15% max discount (85% of list price)
      const minPrice = product.minPrice ? Number(product.minPrice) : Math.round(listPrice * 0.85);

      processedProduct = {
        ...product,
        listPrice,
        minPrice,
      };

      // Rules setup for NegotiationEngine
      const rules: NegotiationRules = {
        minimumPrice: minPrice,
        targetPrice: listPrice,
        walkawayPrice: minPrice,
        discountStepPercent: negotiationRules?.discountStepPercent || 5,
        maxDiscountRounds: negotiationRules?.maxDiscountRounds || 3,
        autoNegotiateEnabled: negotiationRules?.autoNegotiateEnabled ?? true,
        bulkMinQuantity: negotiationRules?.bulkMinQuantity || 0,
        bulkDiscountPercent: negotiationRules?.bulkDiscountPercent || 0,
        requestedQuantity: negotiationRules?.requestedQuantity || 1,
      };

      // Process offer if explicit number is present
      if (extractedOffer !== null) {
        negotiationResult = NegotiationEngine.processOffer(extractedOffer, currentRound, rules);
      } else if (/\b(last|bottom|least|discount|cheapest|reduce|offer)\b/i.test(cleanUserMessage)) {
        // Handle qualitative discount inquiries without dropping below floor price
        negotiationResult = {
          status: 'COUNTER',
          counterOffer: Math.round(listPrice * 0.95), // Start counter-offer at 5% off
          minAllowed: minPrice,
        };
      }
    }

    // Build concise dynamic prompt instruction
    const systemInstruction = buildTradaraSystemInstruction({
      product: processedProduct,
      userName: (req as any).user?.name || undefined,
    });

    // Clean and sanitize chat history format for Gemini SDK
    const formattedHistory = history.map((item) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: item.parts && item.parts.length > 0 ? item.parts : [{ text: '' }],
    }));

    // Instantiate Gemini Model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.2, // Kept low to prevent off-script hallucinations
        maxOutputTokens: 500,
      },
    });

    // Start Chat Session
    const chatSession = model.startChat({
      history: formattedHistory,
    });

    // Append deterministic backend math constraints to user prompt
    let finalPromptMessage = cleanUserMessage;
    if (processedProduct && negotiationResult) {
      finalPromptMessage += `\n\n[SYSTEM GUARDRAIL]: Product List Price = ₦${processedProduct.listPrice.toLocaleString()}, Minimum Floor Price = ₦${processedProduct.minPrice.toLocaleString()}. `;
      if (negotiationResult.counterOffer) {
        finalPromptMessage += `Engine suggested counter-offer = ₦${negotiationResult.counterOffer.toLocaleString()}. NEVER offer any amount below ₦${processedProduct.minPrice.toLocaleString()}.`;
      }
    }

    const result = await chatSession.sendMessage(finalPromptMessage);
    const response = await result.response;
    const aiResponseText = response.text() || "I am available to answer questions or discuss product options.";

    // Generate quick discount chips for UI rendering
    let quickOffers = null;
    if (processedProduct) {
      const list = processedProduct.listPrice;
      const currency = processedProduct.currency || '₦';
      quickOffers = [
        { label: '5% Off', price: Math.round(list * 0.95), formatted: `${currency}${Math.round(list * 0.95).toLocaleString()}` },
        { label: '10% Off', price: Math.round(list * 0.90), formatted: `${currency}${Math.round(list * 0.90).toLocaleString()}` },
        { label: '15% Off (Best)', price: Math.round(list * 0.85), formatted: `${currency}${Math.round(list * 0.85).toLocaleString()}` },
      ];
    }

    res.status(200).json({
      success: true,
      data: {
        response: aiResponseText,
        quickOffers,
        activeProduct: processedProduct || null,
        negotiationEngineOutput: negotiationResult || undefined,
      },
    });
  } catch (error: any) {
    console.error('[ChatController Error]:', error);

    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};