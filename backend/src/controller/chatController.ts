// ==========================================
// FILE: backend/src/controllers/chatController.ts
// ==========================================

import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { buildTradaraSystemInstruction, ProductContext } from '../ai/prompts/tradaraPromptBuilder';
import { NegotiationEngine, NegotiationRules } from '../services/negotiationEngine';

// Initialize the Gemini client using the environment key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
 * Controller handling user interactions with TRADARA AI powered by Gemini.
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

    // Extract potential numeric price offer from user text (e.g. "can I get it for 50000" -> 50000)
    const priceMatch = message.match(/(?:₦|N|NGN|\$)?\s?(\d{1,3}(?:,\d{3})*|\d+)/i);
    let extractedOffer: number | null = null;
    if (priceMatch && priceMatch[1]) {
      const cleanNum = priceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        extractedOffer = parsed;
      }
    }

    // Safety check & Floor price guardrail enforcement
    let processedProduct: ProductContext | undefined = undefined;
    let negotiationResult: any = null;

    if (product && product.listPrice) {
      const listPrice = Number(product.listPrice);
      const minPrice = product.minPrice ? Number(product.minPrice) : Math.round(listPrice * 0.85);

      processedProduct = {
        ...product,
        listPrice,
        minPrice,
      };

      // If buyer sent a specific numeric offer, evaluate through strict TypeScript negotiation engine
      if (extractedOffer !== null) {
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

        negotiationResult = NegotiationEngine.processOffer(extractedOffer, currentRound, rules);
      }
    }

    // Generate dynamic system prompt instructions based on product context
    const systemInstruction = buildTradaraSystemInstruction({
      product: processedProduct,
      userName: (req as any).user?.name || undefined,
    });

    // Format chat history for Gemini SDK
    const formattedHistory = history.map((item) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: item.parts || [{ text: '' }],
    }));

    // Create a stateful Gemini Chat session using gemini-2.5-flash
    const chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.3, // Low temperature keeps Gemini anchored to system guardrails
      },
    });

    // If numerical offer was evaluated by engine, inject result as context context hint
    let finalPromptMessage = message.trim();
    if (negotiationResult) {
      finalPromptMessage += `\n[SYSTEM GUARDRAIL CHECK]: User offered ${extractedOffer}. Negotiation Engine status: ${negotiationResult.status}. Dynamic Counter-Offer: ${negotiationResult.counterOffer || negotiationResult.agreedPrice || processedProduct?.minPrice}. Respond naturally using this math.`;
    }

    // Send latest user input to Gemini
    const result = await chatSession.sendMessage({
      message: finalPromptMessage,
    });

    const aiResponseText = result.text || "I'm sorry, I couldn't generate a response. Please try again.";

    // Parse discount chips for frontend UI
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
      error: 'An error occurred while communicating with TRADARA AI.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};