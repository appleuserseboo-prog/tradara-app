// ==========================================
// FILE: backend/src/ai/orchestrator/AgentOrchestrator.ts
// ==========================================

import { GoogleGenAI } from '@google/genai';
import { ProductContext, buildTradaraSystemInstruction } from '../prompts/tradaraPromptBuilder';
import { NegotiationEngine, NegotiationRules } from '../../services/negotiationEngine';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface OrchestratorRequest {
  message: string;
  history?: ChatMessage[];
  product?: ProductContext;
  negotiationRules?: Partial<NegotiationRules>;
  currentRound?: number;
  userName?: string;
}

export interface OrchestratorResponse {
  responseText: string;
  quickOffers: Array<{ label: string; price: number; formatted: string }> | null;
  activeProduct: ProductContext | null;
  negotiationOutput?: any;
  toolExecuted?: string;
}

export class AgentOrchestrator {
  private ai: GoogleGenAI;
  private primaryModel: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
    // Utilizing gemini-2.5-flash for real-time speed and agentic reasoning
    this.primaryModel = 'gemini-2.5-flash';
  }

  /**
   * Main entry point: Process user input through context analysis, memory extraction,
   * tool execution (negotiation engine), LLM generation, and safety verification.
   */
  public async processRequest(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const cleanUserMessage = request.message.trim();
    let processedProduct: ProductContext | null = null;
    let negotiationResult: any = null;
    let toolExecuted: string | undefined = undefined;

    // 1. EXTRACT NUMERICAL OFFERS (e.g., "50k", "₦50,000", "50000")
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

    // 2. TOOL EXECUTION: COMMERCE & NEGOTIATION ENGINE
    if (request.product && request.product.listPrice) {
      const listPrice = Number(request.product.listPrice);
      // Floor price: default to 15% max discount if minPrice is missing
      const minPrice = request.product.minPrice ? Number(request.product.minPrice) : Math.round(listPrice * 0.85);

      processedProduct = {
        ...request.product,
        listPrice,
        minPrice,
      };

      const rules: NegotiationRules = {
        minimumPrice: minPrice,
        targetPrice: listPrice,
        walkawayPrice: minPrice,
        discountStepPercent: request.negotiationRules?.discountStepPercent || 5,
        maxDiscountRounds: request.negotiationRules?.maxDiscountRounds || 3,
        autoNegotiateEnabled: request.negotiationRules?.autoNegotiateEnabled ?? true,
        bulkMinQuantity: request.negotiationRules?.bulkMinQuantity || 0,
        bulkDiscountPercent: request.negotiationRules?.bulkDiscountPercent || 0,
        requestedQuantity: request.negotiationRules?.requestedQuantity || 1,
      };

      if (extractedOffer !== null) {
        negotiationResult = NegotiationEngine.processOffer(extractedOffer, request.currentRound || 1, rules);
        toolExecuted = 'NegotiationEngine.processOffer';
      } else if (/\b(last|bottom|least|discount|cheapest|reduce|offer|price|how much)\b/i.test(cleanUserMessage)) {
        // Compute dynamic counter offer for generic price inquiries
        const dynamicCounter = Math.max(minPrice, Math.round(listPrice * 0.90));
        negotiationResult = {
          status: 'countered',
          counterOffer: dynamicCounter,
          message: `Listed price is ₦${listPrice.toLocaleString()}, but I can offer ₦${dynamicCounter.toLocaleString()} right now.`,
        };
        toolExecuted = 'NegotiationEngine.counterOffer';
      }
    }

    // 3. CONTEXT BUILDER & SYSTEM PROMPT GENERATION
    const systemInstruction = buildTradaraSystemInstruction({
      product: processedProduct,
      userName: request.userName,
    });

    // 4. SHORT-TERM MEMORY SANITIZATION
    // Filter out past loops and empty tokens from memory history
    const sanitizedHistory = (request.history || [])
      .filter((item) => {
        const text = item.parts?.[0]?.text || '';
        return (
          !text.includes('I am fully equipped to answer general questions') &&
          !text.includes('You asked:') &&
          !text.includes('Thank you for asking about') &&
          text.trim() !== ''
        );
      })
      .map((item) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: item.parts && item.parts.length > 0 ? item.parts : [{ text: '' }],
      }));

    // 5. PROMPT FORMULATION WITH TOOL DIRECTIVES
    let promptToSend = cleanUserMessage;
    if (processedProduct && negotiationResult && negotiationResult.counterOffer) {
      promptToSend = `[COMMERCE ENGINE DIRECTIVE]: User requested price/discount ("${cleanUserMessage}"). Listed price: ₦${processedProduct.listPrice.toLocaleString()}. Calculated target counter-offer: ₦${negotiationResult.counterOffer.toLocaleString()} (Floor Limit: ₦${processedProduct.minPrice.toLocaleString()}). Offer them ₦${negotiationResult.counterOffer.toLocaleString()} directly as our best offer. Do not state the list price without presenting this counter-offer.`;
    }

    // 6. LLM GENERATION VIA GEMINI SDK
    let finalResponseText = '';
    try {
      // Build full conversation payload including sanitized history and current prompt
      const contents = [
        ...sanitizedHistory.map((h) => ({
          role: h.role,
          parts: h.parts.map((p) => ({ text: p.text })),
        })),
        {
          role: 'user',
          parts: [{ text: promptToSend }],
        },
      ];

      const aiResponse = await this.ai.models.generateContent({
        model: this.primaryModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.25,
          maxOutputTokens: 600,
        },
      });

      finalResponseText = aiResponse.text?.trim() || '';
    } catch (err) {
      console.error('[AgentOrchestrator Generation Error]:', err);
      // Fallback response if API network call hiccups
      if (negotiationResult?.counterOffer && processedProduct) {
        finalResponseText = `The listed price for ${processedProduct.name} is ₦${processedProduct.listPrice.toLocaleString()}, but I can offer it to you for ₦${negotiationResult.counterOffer.toLocaleString()} as our best deal right now!`;
      } else {
        finalResponseText = `I am here to assist you with TRADARA marketplace items, price negotiations, and general inquiries. How can I help you?`;
      }
    }

    // 7. SAFETY & SELF-VERIFICATION GUARD
    // Enforce pricing floor in the final string if LLM output missed the numeric calculation
    if (
      processedProduct &&
      negotiationResult?.counterOffer &&
      /\b(last|bottom|least|discount|cheapest)\b/i.test(cleanUserMessage) &&
      !finalResponseText.includes(negotiationResult.counterOffer.toLocaleString())
    ) {
      finalResponseText = `The listed price for ${processedProduct.name} is ₦${processedProduct.listPrice.toLocaleString()}, but I can offer it to you for ₦${negotiationResult.counterOffer.toLocaleString()} as our best price right now.`;
    }

    // 8. GENERATE QUICK OFFER CHIPS FOR FRONTEND UI
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

    return {
      responseText: finalResponseText,
      quickOffers,
      activeProduct: processedProduct,
      negotiationOutput: negotiationResult || undefined,
      toolExecuted,
    };
  }
}