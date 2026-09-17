// ==========================================
// FILE: backend/src/controllers/chatController.ts
// ==========================================

import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  buildTradaraSystemInstruction,
  ProductContext
} from '../ai/prompts/tradaraPromptBuilder';
import {
  NegotiationEngine,
  NegotiationRules
} from '../services/negotiationEngine';
import { AgentOrchestrator } from '../ai/orchestrator/AgentOrchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  '';

const ai = new GoogleGenAI({
  apiKey
});

export interface ChatMessageHistoryItem {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

export interface ChatRequestBody {
  message: string;
  history?: ChatMessageHistoryItem[];
  conversationHistory?: any[];
  product?: ProductContext;
  negotiationRules?: Partial<NegotiationRules>;
  currentRound?: number;
  sessionId?: string;
  userConfirmationConfirmed?: boolean;
  pendingTool?: any;
}

const orchestrator =
  new AgentOrchestrator();

/**
 * Handles intelligent multi-turn interaction with TRADARA AI.
 *
 * This controller supports:
 * - General AI questions
 * - Product-aware conversations
 * - Negotiation
 * - Existing AgentOrchestrator integration
 * - Database sessions
 * - SSE streaming
 */
export const handleAiChat = async (
  req: Request<
    {},
    {},
    ChatRequestBody
  >,
  res: Response
): Promise<void> => {
  try {
    const {
      message,
      history = [],
      conversationHistory = [],
      product,
      negotiationRules,
      currentRound = 1,
      sessionId
    } = req.body || {};

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim() === ''
    ) {
      res.status(400).json({
        success: false,
        error: 'Message string is required.'
      });

      return;
    }

    const cleanUserMessage =
      message.trim();

    const userId =
      (req as any).user?.id ||
      null;

    // ==========================================
    // Session Persistence
    // ==========================================

    let activeChatSessionId:
      | string
      | undefined = sessionId;

    if (userId) {
      if (activeChatSessionId) {
        try {
          const sessionDelegate =
            (prisma as any).chatSession ||
            (prisma as any).aiChatSession;

          if (sessionDelegate) {
            const existingSession =
              await sessionDelegate.findUnique({
                where: {
                  id: activeChatSessionId
                }
              });

            if (!existingSession) {
              activeChatSessionId =
                undefined;
            }
          }
        } catch {
          activeChatSessionId =
            undefined;
        }
      }

      if (!activeChatSessionId) {
        try {
          const titleSnippet =
            cleanUserMessage.length > 40
              ? `${cleanUserMessage.substring(
                  0,
                  37
                )}...`
              : cleanUserMessage;

          const sessionDelegate =
            (prisma as any).chatSession ||
            (prisma as any).aiChatSession;

          if (sessionDelegate) {
            const newDbSession =
              await sessionDelegate.create({
                data: {
                  title: titleSnippet,
                  userId,
                  itemId:
                    product?.id || null
                }
              });

            activeChatSessionId =
              newDbSession.id;
          }
        } catch (error) {
          console.warn(
            '[ChatController] Session persistence unavailable:',
            error
          );
        }
      }

      if (activeChatSessionId) {
        try {
          const messageDelegate =
            (prisma as any).chatMessage ||
            (prisma as any).aiChatMessage;

          if (messageDelegate) {
            await messageDelegate
              .create({
                data: {
                  sessionId:
                    activeChatSessionId,
                  role: 'user',
                  content:
                    cleanUserMessage
                }
              })
              .catch(async () => {
                await messageDelegate.create({
                  data: {
                    sessionId:
                      activeChatSessionId,
                    sender: 'user',
                    content:
                      cleanUserMessage
                  }
                });
              });
          }
        } catch (error) {
          console.warn(
            '[ChatController] User message persistence skipped:',
            error
          );
        }
      }
    }

    // ==========================================
    // Orchestrator Attempt
    // ==========================================

    let orchestratorResult: any =
      null;

    try {
      if (
        typeof (
          orchestrator as any
        ).processRequest === 'function'
      ) {
        orchestratorResult =
          await (
            orchestrator as any
          ).processRequest({
            message:
              cleanUserMessage,
            history:
              history.length
                ? history
                : conversationHistory,
            product,
            negotiationRules,
            currentRound,
            userName:
              (req as any).user?.name ||
              undefined
          });
      }
    } catch (error) {
      console.warn(
        '[ChatController] Orchestrator did not complete request:',
        error
      );
    }

    // ==========================================
    // Numeric Offer Detection
    // ==========================================

    let extractedOffer:
      | number
      | null = null;

    const kMatch =
      cleanUserMessage.match(
        /(?:₦|N|NGN|\$)?\s?(\d+(?:\.\d+)?)\s?k\b/i
      );

    if (kMatch) {
      extractedOffer =
        parseFloat(kMatch[1]) * 1000;
    } else {
      const priceMatch =
        cleanUserMessage.match(
          /(?:₦|N|NGN|\$)?\s?(\d{1,3}(?:,\d{3})+|\d+)/i
        );

      if (
        priceMatch &&
        priceMatch[1]
      ) {
        const cleanNum =
          priceMatch[1].replace(
            /,/g,
            ''
          );

        const parsed =
          parseFloat(cleanNum);

        if (
          !Number.isNaN(parsed) &&
          parsed > 0
        ) {
          extractedOffer =
            parsed;
        }
      }
    }

    // ==========================================
    // Product Negotiation
    // ==========================================

    let processedProduct:
      | ProductContext
      | undefined;

    let negotiationResult:
      | any
      | null = null;

    if (
      product &&
      product.listPrice
    ) {
      const listPrice =
        Number(product.listPrice);

      const minPrice =
        product.minPrice
          ? Number(product.minPrice)
          : Math.round(
              listPrice * 0.85
            );

      processedProduct = {
        ...product,
        listPrice,
        minPrice
      };

      const rules:
        NegotiationRules = {
        minimumPrice:
          minPrice,
        targetPrice:
          listPrice,
        walkawayPrice:
          minPrice,
        discountStepPercent:
          negotiationRules
            ?.discountStepPercent ||
          5,
        maxDiscountRounds:
          negotiationRules
            ?.maxDiscountRounds ||
          3,
        autoNegotiateEnabled:
          negotiationRules
            ?.autoNegotiateEnabled ??
          true,
        bulkMinQuantity:
          negotiationRules
            ?.bulkMinQuantity ||
          0,
        bulkDiscountPercent:
          negotiationRules
            ?.bulkDiscountPercent ||
          0,
        requestedQuantity:
          negotiationRules
            ?.requestedQuantity ||
          1
      };

      if (
        extractedOffer !== null
      ) {
        negotiationResult =
          NegotiationEngine.processOffer(
            extractedOffer,
            currentRound,
            rules
          );
      } else if (
        /\b(last|bottom|least|discount|cheapest|reduce|offer|price|how much)\b/i.test(
          cleanUserMessage
        )
      ) {
        const dynamicCounter =
          Math.max(
            minPrice,
            Math.round(
              listPrice * 0.9
            )
          );

        negotiationResult = {
          status: 'countered',
          counterOffer:
            dynamicCounter,
          message: `Listed price is ₦${listPrice.toLocaleString()}, but I can offer ₦${dynamicCounter.toLocaleString()} right now.`
        };
      }
    }

    // ==========================================
    // System Instruction
    // ==========================================

    const baseInstruction =
      buildTradaraSystemInstruction({
        product:
          processedProduct,
        userName:
          (req as any).user?.name ||
          undefined
      });

    const systemInstruction = `
${baseInstruction}

You are TRADARA AI, an advanced general-purpose intelligent assistant integrated into the TRADARA marketplace.

Answer the user's actual question.

You can help with:
- General knowledge
- Mathematics
- Programming
- Software development
- Science
- Technology
- Business
- Education
- Writing
- Reasoning
- Product research
- Marketplace questions
- Negotiation
- Planning and problem solving

Do not force general questions into e-commerce.
Do not use generic filler.
Do not pretend that a tool was executed unless it actually was.
Do not pretend to have browsed the web unless a real browsing tool was executed.
Maintain conversation context.
Use clear, natural Markdown.
`;

    // ==========================================
    // History Sanitization
    // ==========================================

    const suppliedHistory =
      history.length
        ? history
        : conversationHistory;

    const formattedHistory =
      (suppliedHistory || [])
        .filter((item: any) => {
          const text =
            item.parts?.[0]?.text ||
            item.content ||
            item.message ||
            '';

          return (
            typeof text === 'string' &&
            text.trim().length > 0
          );
        })
        .slice(-20)
        .map((item: any) => ({
          role:
            item.role === 'user'
              ? 'user'
              : 'model',
          parts:
            item.parts &&
            item.parts.length > 0
              ? item.parts
              : [
                  {
                    text:
                      item.content ||
                      item.message ||
                      ''
                  }
                ]
        }));

    // ==========================================
    // Commerce Directive
    // ==========================================

    let promptToSend =
      cleanUserMessage;

    if (
      processedProduct &&
      negotiationResult?.counterOffer &&
      /\b(last|bottom|least|discount|cheapest)\b/i.test(
        cleanUserMessage
      )
    ) {
      promptToSend = `
[COMMERCE ENGINE CONTEXT]

User request:
${cleanUserMessage}

Listed price:
₦${processedProduct.listPrice.toLocaleString()}

Calculated counter-offer:
₦${negotiationResult.counterOffer.toLocaleString()}

Floor:
₦${processedProduct.minPrice.toLocaleString()}

Use the calculated negotiation result where applicable.
Do not invent a lower price.

Now respond naturally to the user.
`;
    }

    // ==========================================
    // If orchestrator already produced a useful
    // response, keep it available as context.
    // Do not automatically replace Gemini with
    // a generic orchestrator fallback.
    // ==========================================

    if (
      orchestratorResult?.responseText &&
      orchestratorResult?.toolExecuted
    ) {
      promptToSend = `
${promptToSend}

An authorized backend orchestration step produced:
${orchestratorResult.responseText}

Use this information when relevant. Do not claim a tool executed unless the result confirms it.
`;
    }

    // ==========================================
    // Gemini Chat
    // ==========================================

    const model =
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';

    const chatSession =
      ai.chats.create({
        model,
        config: {
          systemInstruction,
          temperature: 0.5,
          maxOutputTokens: 2048
        },
        history:
          formattedHistory as any
      });

    res.setHeader(
      'Content-Type',
      'text/event-stream'
    );
    res.setHeader(
      'Cache-Control',
      'no-cache, no-transform'
    );
    res.setHeader(
      'Connection',
      'keep-alive'
    );

    let aiResponseText = '';

    try {
      const streamResult =
        await chatSession.sendMessageStream({
          message: promptToSend
        });

      for await (const chunk of streamResult) {
        const chunkText =
          chunk.text || '';

        if (!chunkText) continue;

        aiResponseText +=
          chunkText;

        res.write(
          `data: ${JSON.stringify({
            chunk: chunkText
          })}\n\n`
        );
      }
    } catch (streamError) {
      console.error(
        '[ChatController] Gemini stream failed:',
        streamError
      );

      if (
        orchestratorResult?.responseText
      ) {
        aiResponseText =
          orchestratorResult.responseText;

        res.write(
          `data: ${JSON.stringify({
            chunk: aiResponseText
          })}\n\n`
        );
      } else {
        throw streamError;
      }
    }

    if (!aiResponseText.trim()) {
      throw new Error(
        'The AI model returned an empty response.'
      );
    }

    // ==========================================
    // Save Model Response
    // ==========================================

    if (
      userId &&
      activeChatSessionId
    ) {
      try {
        const messageDelegate =
          (prisma as any).chatMessage ||
          (prisma as any).aiChatMessage;

        if (messageDelegate) {
          await messageDelegate
            .create({
              data: {
                sessionId:
                  activeChatSessionId,
                role: 'model',
                content:
                  aiResponseText
              }
            })
            .catch(async () => {
              await messageDelegate.create({
                data: {
                  sessionId:
                    activeChatSessionId,
                  sender: 'model',
                  content:
                    aiResponseText
                }
              });
            });
        }
      } catch (error) {
        console.warn(
          '[ChatController] Model message persistence skipped:',
          error
        );
      }
    }

    // ==========================================
    // Quick Offers
    // ==========================================

    let quickOffers =
      null;

    if (processedProduct) {
      const list =
        processedProduct.listPrice;

      const currency =
        processedProduct.currency ||
        '₦';

      quickOffers = [
        {
          label: '5% Off',
          price: Math.round(
            list * 0.95
          ),
          formatted: `${currency}${Math.round(
            list * 0.95
          ).toLocaleString()}`
        },
        {
          label: '10% Off',
          price: Math.round(
            list * 0.9
          ),
          formatted: `${currency}${Math.round(
            list * 0.9
          ).toLocaleString()}`
        },
        {
          label: '15% Off',
          price: Math.round(
            list * 0.85
          ),
          formatted: `${currency}${Math.round(
            list * 0.85
          ).toLocaleString()}`
        }
      ];
    }

    // ==========================================
    // Completion Event
    // ==========================================

    res.write(
      `data: ${JSON.stringify({
        done: true,
        data: {
          response:
            aiResponseText,
          sessionId:
            activeChatSessionId,
          quickOffers,
          activeProduct:
            processedProduct ||
            null,
          negotiationEngineOutput:
            negotiationResult ||
            undefined,
          toolExecuted:
            Boolean(
              orchestratorResult?.toolExecuted
            ),
          toolExecutions:
            orchestratorResult?.toolExecutions ||
            []
        }
      })}\n\n`
    );

    res.end();
  } catch (error: any) {
    console.error(
      '[ChatController Error]:',
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error:
          error.message ||
          'An error occurred while processing your request.',
        details:
          process.env.NODE_ENV ===
          'development'
            ? error.stack
            : undefined
      });
    } else {
      res.write(
        `data: ${JSON.stringify({
          error:
            error.message ||
            'Stream error encountered.'
        })}\n\n`
      );

      res.end();
    }
  }
};