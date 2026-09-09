// ==========================================
// FILE: backend/src/controllers/chatController.ts
// ==========================================

import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { buildTradaraSystemInstruction, ProductContext } from '../ai/prompts/tradaraPromptBuilder';
import { NegotiationEngine, NegotiationRules } from '../services/negotiationEngine';
import { AgentOrchestrator } from '../ai/orchestrator/AgentOrchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize the modern @google/genai SDK client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Singleton instance of the Agent Orchestrator
const orchestrator = new AgentOrchestrator();

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
  sessionId?: string;
}

/**
 * Controller handling intelligent multi-turn interaction with TRADARA AI,
 * incorporating blazing-fast streaming responses, location awareness, database session persistence,
 * and direct generative model fallback.
 */
export const handleAiChat = async (req: Request<{}, {}, ChatRequestBody>, res: Response): Promise<void> => {
  try {
    const { message, history = [], product, negotiationRules, currentRound = 1, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Message string is required.',
      });
      return;
    }

    const cleanUserMessage = message.trim();
    const userId = (req as any).user?.id || null;

    // 1. Resolve or create database chat session if user is authenticated
    let activeChatSessionId: string | undefined = sessionId;
    if (userId) {
      if (activeChatSessionId) {
        // Use standard delegate name or fallback gracefully
        const existingSession = await (prisma as any).chatSession?.findUnique({
          where: { id: activeChatSessionId },
        }).catch(() => null) || await (prisma as any).aiChatSession?.findUnique({
          where: { id: activeChatSessionId },
        }).catch(() => null);

        if (!existingSession) {
          activeChatSessionId = undefined;
        }
      }
      if (!activeChatSessionId) {
        const titleSnippet = cleanUserMessage.length > 30 ? cleanUserMessage.substring(0, 30) + '...' : cleanUserMessage;
        
        const sessionDelegate = (prisma as any).chatSession || (prisma as any).aiChatSession;
        if (sessionDelegate) {
          const newDbSession = await sessionDelegate.create({
            data: {
              title: titleSnippet,
              userId,
              itemId: product?.id || null,
            },
          });
          activeChatSessionId = newDbSession.id;
        }
      }

      // Save user message to database
      const messageDelegate = (prisma as any).chatMessage || (prisma as any).aiChatMessage;
      if (messageDelegate && activeChatSessionId) {
        await messageDelegate.create({
          data: {
            sessionId: activeChatSessionId,
            role: 'user',
            content: cleanUserMessage,
          },
        }).catch(async () => {
          // Fallback if schema uses 'sender' instead of 'role'
          await messageDelegate.create({
            data: {
              sessionId: activeChatSessionId,
              sender: 'user',
              content: cleanUserMessage,
            },
          });
        });
      }
    }

    // 2. Try orchestrator request first
    let orchestratorResult: any = null;
    try {
      if (typeof orchestrator.processRequest === 'function') {
        orchestratorResult = await orchestrator.processRequest({
          message: cleanUserMessage,
          history,
          product,
          negotiationRules,
          currentRound,
          userName: (req as any).user?.name || undefined,
        });
      }
    } catch (orchestratorError) {
      console.warn('[ChatController] Orchestrator execution skipped, proceeding with robust direct generative flow:', orchestratorError);
    }

    // 3. Extract explicit numeric offers (e.g., "50k", "₦50,000", "50000")
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

    // 4. Evaluate pricing & negotiation bounds if product is active
    if (product && product.listPrice) {
      const listPrice = Number(product.listPrice);
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
        const dynamicCounter = Math.max(minPrice, Math.round(listPrice * 0.90));
        negotiationResult = {
          status: 'countered',
          counterOffer: dynamicCounter,
          message: `Listed price is ₦${listPrice.toLocaleString()}, but I can offer ₦${dynamicCounter.toLocaleString()} right now.`,
        };
      }
    }

    // 5. Build comprehensive system instructions allowing both commerce and general queries (math, code, greetings)
    const baseInstruction = buildTradaraSystemInstruction({
      product: processedProduct,
      userName: (req as any).user?.name || undefined,
    });

    const systemInstruction = `${baseInstruction}
You are TRADARA AI, an advanced, highly intelligent AI assistant built for TRADARA.
You are fully equipped to answer general knowledge questions, solve math problems (such as evaluating 2+2 or equations), write and debug code, explain complex technical concepts, and assist with e-commerce negotiations.
Provide precise, direct, and insightful answers. If the user asks a general question, answer it thoroughly and helpfully.`;

    // 6. Sanitize history
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

    // 7. Initialize Generative Chat Session using modern @google/genai SDK with gemini-2.5-flash and streaming optimization
    let promptToSend = cleanUserMessage;
    if (processedProduct && negotiationResult && negotiationResult.counterOffer && !/\b(2\s*\+\s*2|hello|hi|hey|code|python|javascript|typescript|function)\b/i.test(cleanUserMessage)) {
      promptToSend = `[COMMERCE ENGINE DIRECTIVE]: User requested price/discount ("${cleanUserMessage}"). Listed price: ₦${processedProduct.listPrice.toLocaleString()}. Calculated target counter-offer: ₦${negotiationResult.counterOffer.toLocaleString()} (Floor Limit: ₦${processedProduct.minPrice.toLocaleString()}). Offer them ₦${negotiationResult.counterOffer.toLocaleString()} as our best deal. Do not quote the list price without giving this counter-offer.`;
    }

    const chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
      history: formattedHistory as any,
    });

    // Enable Server-Sent Events (SSE) streaming for blazing-fast perceived response time
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const streamResult = await chatSession.sendMessageStream({ message: promptToSend });
    let aiResponseText = '';

    for await (const chunk of streamResult) {
      const chunkText = chunk.text || '';
      aiResponseText += chunkText;
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }

    // Fallback if model response is empty
    if (!aiResponseText && orchestratorResult?.responseText) {
      aiResponseText = orchestratorResult.responseText;
    } else if (!aiResponseText) {
      aiResponseText = "Hello! I am TRADARA AI. How can I help you with our marketplace or answer your questions today?";
    }

    // 8. Hard-Guard Fallback: Enforce counter-offer in response text if LLM misses the number on price requests
    if (
      processedProduct &&
      negotiationResult?.counterOffer &&
      /\b(last|bottom|least|discount|cheapest)\b/i.test(cleanUserMessage) &&
      !aiResponseText.includes(negotiationResult.counterOffer.toLocaleString())
    ) {
      aiResponseText = `The listed price for ${processedProduct.name} is ₦${processedProduct.listPrice.toLocaleString()}, but I can offer it to you for ₦${negotiationResult.counterOffer.toLocaleString()} as our best price right now.`;
    }

    // Save model response to database if authenticated
    if (userId && activeChatSessionId) {
      const messageDelegate = (prisma as any).chatMessage || (prisma as any).aiChatMessage;
      if (messageDelegate) {
        await messageDelegate.create({
          data: {
            sessionId: activeChatSessionId,
            role: 'model',
            content: aiResponseText,
          },
        }).catch(async () => {
          await messageDelegate.create({
            data: {
              sessionId: activeChatSessionId,
              sender: 'model',
              content: aiResponseText,
            },
          });
        });
      }
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

    // Send completion event with metadata
    res.write(`data: ${JSON.stringify({
      done: true,
      data: {
        response: aiResponseText,
        sessionId: activeChatSessionId,
        quickOffers,
        activeProduct: processedProduct || null,
        negotiationEngineOutput: negotiationResult || undefined,
        toolExecuted: orchestratorResult?.toolExecuted || false,
      }
    })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error('[ChatController Error]:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'An error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream error encountered.' })}\n\n`);
      res.end();
    }
  }
};