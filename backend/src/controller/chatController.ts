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
 * Controller handling intelligent multi-turn interaction with TRADARA AI.
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

    // 1. Extract explicit numeric offers (e.g., "50k", "₦50,000", "50000")
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

    // 2. Evaluate pricing & negotiation bounds
    if (product && product.listPrice) {
      const listPrice = Number(product.listPrice);
      // Floor limit set to maximum 15% discount unless explicitly passed
      const minPrice = product.minPrice ? Number(product.minPrice) : Math.round(listPrice * 0.85);

      processedProduct = {
        ...product,
        listPrice,
        minPrice,
      };

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

      if (extractedOffer !== null) {
        negotiationResult = NegotiationEngine.processOffer(extractedOffer, currentRound, rules);
      } else if (/\b(last|bottom|least|discount|cheapest|reduce|offer|price|how much)\b/i.test(cleanUserMessage)) {
        // Calculate counter offer (e.g., 10% discount for general discount inquiry)
        const dynamicCounter = Math.max(minPrice, Math.round(listPrice * 0.90));
        negotiationResult = {
          status: 'countered',
          counterOffer: dynamicCounter,
          message: `Listed price is ₦${listPrice.toLocaleString()}, but I can offer ₦${dynamicCounter.toLocaleString()} right now.`,
        };
      }
    }

    // 3. Build dynamic instructions
    const systemInstruction = buildTradaraSystemInstruction({
      product: processedProduct,
      userName: (req as any).user?.name || undefined,
    });

    // 4. Sanitize history to strip past robotic loops and empty tokens
    const formattedHistory = history
      .filter((item) => {
        const text = item.parts?.[0]?.text || '';
        return (
          !text.includes('I am fully equipped to answer general questions') &&
          !text.includes('You asked:') &&
          !text.includes('Thank you for asking about')
        );
      })
      .map((item) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: item.parts && item.parts.length > 0 ? item.parts : [{ text: '' }],
      }));

    // 5. Initialize Generative Model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 600,
      },
    });

    // 6. Formulate precise context prompt
    let promptToSend = cleanUserMessage;
    if (processedProduct && negotiationResult && negotiationResult.counterOffer) {
      promptToSend = `[COMMERCE ENGINE DIRECTIVE]: User requested price/discount ("${cleanUserMessage}"). Listed price: ₦${processedProduct.listPrice.toLocaleString()}. Calculated target counter-offer: ₦${negotiationResult.counterOffer.toLocaleString()} (Floor Limit: ₦${processedProduct.minPrice.toLocaleString()}). Offer them ₦${negotiationResult.counterOffer.toLocaleString()} as our best deal. Do not quote the list price without giving this counter-offer.`;
    }

    const chatSession = model.startChat({ history: formattedHistory });
    const result = await chatSession.sendMessage(promptToSend);
    const response = await result.response;
    let aiResponseText = response.text()?.trim() || '';

    // 7. Hard-Guard Fallback: Enforce counter-offer in response text if LLM misses the number on price requests
    if (
      processedProduct &&
      negotiationResult?.counterOffer &&
      /\b(last|bottom|least|discount|cheapest)\b/i.test(cleanUserMessage) &&
      !aiResponseText.includes(negotiationResult.counterOffer.toLocaleString())
    ) {
      aiResponseText = `The listed price for ${processedProduct.name} is ₦${processedProduct.listPrice.toLocaleString()}, but I can offer it to you for ₦${negotiationResult.counterOffer.toLocaleString()} as our best price right now.`;
    }

    // Quick discount chips for frontend UI
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