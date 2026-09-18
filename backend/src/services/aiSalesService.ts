// ==========================================
// FILE: backend/src/services/aiSalesService.ts
// ==========================================

import prisma from '../lib/prisma';
import { NegotiationEngine } from './negotiationEngine';
import { GoogleGenAI } from '@google/genai';

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  '';

const ai = new GoogleGenAI({
  apiKey
});

export interface ProcessChatMessageInput {
  itemId?: string;
  buyerSession: string;
  buyerId?: string;
  message: string;
  offeredPrice?: number;
  quantity?: number;
  systemPrompt?: string;
  sessionId?: string;
  history?: Array<{
    role:
      | 'user'
      | 'model'
      | 'assistant';
    parts?: Array<{
      text: string;
    }>;
    content?: string;
    message?: string;
  }>;
  userConfirmationConfirmed?: boolean;
  pendingTool?: any;
}

export interface BuyerPerception {
  sentiment:
    | 'positive'
    | 'neutral'
    | 'negative'
    | 'frustrated'
    | 'eager';
  urgency:
    | 'low'
    | 'medium'
    | 'high';
  priceSensitivity:
    | 'low'
    | 'medium'
    | 'high';
  detectedIntent:
    | 'inquiry'
    | 'bargain'
    | 'specs_check'
    | 'human_request'
    | 'bulk_inquiry'
    | 'closing'
    | 'general';
  estimatedMaxBudget?: number;
}

export interface MarketplaceIntelligence {
  itemHistoricalConversions: number;
  averageAgreedDiscountPercent: number;
  buyerPastNegotiationCount: number;
  buyerSuccessfulDeals: number;
  categoryDemandScore: number;
}

export class AiSalesService {
  /**
   * Helper function to sanitize AI responses without destroying
   * legitimate Markdown structure.
   */
  private static sanitizeMarkdownOutput(
    text: string
  ): string {
    if (!text) {
      return '';
    }

    let sanitized = text
      .replace(/\r\n/g, '\n')
      .replace(/\u0000/g, '');

    sanitized = sanitized.replace(
      /^\s*[*]\s*$/gm,
      ''
    );

    sanitized = sanitized.replace(
      /\n{4,}/g,
      '\n\n\n'
    );

    return sanitized.trim();
  }

  /**
   * Perception Module.
   *
   * This is used for commerce intelligence and negotiation behavior.
   * It is NOT used as the gatekeeper for general AI questions.
   */
  private static perceiveBuyerIntent(
    message: string,
    offeredPrice?: number,
    listPrice: number = 0
  ): BuyerPerception {
    const msgLower =
      message.toLowerCase().trim();

    let sentiment: BuyerPerception['sentiment'] =
      'neutral';

    let urgency: BuyerPerception['urgency'] =
      'medium';

    let priceSensitivity: BuyerPerception['priceSensitivity'] =
      'medium';

    let detectedIntent: BuyerPerception['detectedIntent'] =
      'inquiry';

    if (
      /\b(urgent|today|now|asap|fast|quickly)\b/i.test(
        msgLower
      )
    ) {
      urgency = 'high';
      sentiment = 'eager';
    }

    if (
      /\b(expensive|too high|ridiculous|scam|unreasonable)\b/i.test(
        msgLower
      )
    ) {
      sentiment = 'frustrated';
      priceSensitivity = 'high';
    } else if (
      /\b(love|great|perfect|interested|nice|beautiful)\b/i.test(
        msgLower
      )
    ) {
      sentiment = 'positive';
    } else if (
      /\b(hate|bad|terrible|disappointed)\b/i.test(
        msgLower
      )
    ) {
      sentiment = 'negative';
    }

    if (
      offeredPrice !== undefined ||
      /\b(bottom|negotiable|last price|discount|cheaper|reduce|offer|how much|price)\b/i.test(
        msgLower
      )
    ) {
      detectedIntent = 'bargain';
      priceSensitivity = 'high';
    } else if (
      /\b(spec|specs|condition|warranty|authentic|original|location|city|area|features)\b/i.test(
        msgLower
      )
    ) {
      detectedIntent =
        'specs_check';
    } else if (
      /\b(wholesale|bulk|quantity|many units|large order)\b/i.test(
        msgLower
      )
    ) {
      detectedIntent =
        'bulk_inquiry';
    } else if (
      /\b(human|agent|call|seller|person|representative)\b/i.test(
        msgLower
      )
    ) {
      detectedIntent =
        'human_request';
    } else if (
      /\b(buy|take it|deal|pay|checkout|purchase)\b/i.test(
        msgLower
      )
    ) {
      detectedIntent =
        'closing';

      urgency = 'high';
    } else {
      detectedIntent =
        'general';
    }

    let estimatedMaxBudget:
      | number
      | undefined;

    if (
      offeredPrice !== undefined
    ) {
      estimatedMaxBudget =
        offeredPrice;
    } else if (
      listPrice > 0 &&
      priceSensitivity ===
        'high'
    ) {
      estimatedMaxBudget =
        listPrice * 0.85;
    }

    return {
      sentiment,
      urgency,
      priceSensitivity,
      detectedIntent,
      estimatedMaxBudget
    };
  }

  /**
   * Retrieve marketplace intelligence.
   */
  private static async gatherMarketplaceIntelligence(
    itemId?: string,
    buyerId?: string
  ): Promise<MarketplaceIntelligence> {
    try {
      if (
        !itemId ||
        itemId ===
          'general-ai-session'
      ) {
        return {
          itemHistoricalConversions: 0,
          averageAgreedDiscountPercent: 0,
          buyerPastNegotiationCount: 0,
          buyerSuccessfulDeals: 0,
          categoryDemandScore: 0.5
        };
      }

      const itemPastSessions =
        await (
          prisma as any
        ).aiNegotiationSession.findMany(
          {
            where: {
              itemId,
              status: 'agreed'
            },
            take: 100
          }
        );

      const itemHistoricalConversions =
        itemPastSessions.length;

      let averageAgreedDiscountPercent = 0;

      if (
        itemHistoricalConversions >
        0
      ) {
        const totalDiscounts =
          itemPastSessions.reduce(
            (
              acc: number,
              session: any
            ) => {
              if (
                session.agreedPrice &&
                session.currentOffer &&
                session.currentOffer > 0
              ) {
                return (
                  acc +
                  ((session.currentOffer -
                    session.agreedPrice) /
                    session.currentOffer)
                );
              }

              return acc;
            },
            0
          );

        averageAgreedDiscountPercent =
          (totalDiscounts /
            itemHistoricalConversions) *
          100;
      }

      let buyerPastNegotiationCount = 0;
      let buyerSuccessfulDeals = 0;

      if (buyerId) {
        const buyerSessions =
          await (
            prisma as any
          ).aiNegotiationSession.findMany(
            {
              where: {
                buyerId
              },
              take: 200
            }
          );

        buyerPastNegotiationCount =
          buyerSessions.length;

        buyerSuccessfulDeals =
          buyerSessions.filter(
            (session: any) =>
              session.status ===
              'agreed'
          ).length;
      }

      return {
        itemHistoricalConversions,
        averageAgreedDiscountPercent:
          Number(
            averageAgreedDiscountPercent.toFixed(
              2
            )
          ),
        buyerPastNegotiationCount,
        buyerSuccessfulDeals,
        categoryDemandScore:
          itemHistoricalConversions >
          10
            ? 0.9
            : 0.5
      };
    } catch (error) {
      console.error(
        'Error gathering marketplace intelligence:',
        error
      );

      return {
        itemHistoricalConversions: 0,
        averageAgreedDiscountPercent: 0,
        buyerPastNegotiationCount: 0,
        buyerSuccessfulDeals: 0,
        categoryDemandScore: 0.5
      };
    }
  }

  /**
   * Learning Loop Engine.
   */
  private static async recordInteractionLearning(
    sessionId: string,
    buyerMessage: string,
    aiResponse: string,
    perception: BuyerPerception,
    dealStatus: string
  ): Promise<void> {
    try {
      if (
        (prisma as any)
          .aiLearningLog
      ) {
        await (
          prisma as any
        ).aiLearningLog.create({
          data: {
            sessionId,
            buyerMessage,
            aiResponse,
            perceivedSentiment:
              perception.sentiment,
            perceivedUrgency:
              perception.urgency,
            detectedIntent:
              perception.detectedIntent,
            dealStatus,
            timestamp: new Date()
          }
        });
      }
    } catch (error) {
      console.warn(
        'Learning log persistence bypassed:',
        error
      );
    }
  }

  /**
   * Generate content with a conservative model fallback.
   *
   * Do not list models that may not exist. The primary model can
   * be changed with GEMINI_MODEL without changing application code.
   *
   * Current stable Gemini Flash models are preferred.
   *
   * The fallback chain intentionally avoids Gemini 2.5 Flash because
   * the current deployed API account has already returned HTTP 404
   * for that model.
   */
  private static async generateWithModelFallback(
    params: {
      contents: any;
      config?: any;
    }
  ) {
    const configuredModel =
      (
        process.env.GEMINI_MODEL ||
        ''
      ).trim();

    const supportedModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash'
    ];

    const modelsToTry: string[] = [];

    if (
      configuredModel &&
      supportedModels.includes(
        configuredModel
      )
    ) {
      modelsToTry.push(
        configuredModel
      );
    }

    for (const modelName of supportedModels) {
      if (
        !modelsToTry.includes(
          modelName
        )
      ) {
        modelsToTry.push(
          modelName
        );
      }
    }

    let lastError: any;

    for (const modelName of modelsToTry) {
      try {
        console.info(
          `[Gemini] Attempting model: ${modelName}`
        );

        return await ai.models.generateContent(
          {
            model: modelName,
            contents:
              params.contents,
            config:
              params.config
          }
        );
      } catch (error: any) {
        console.warn(
          `[Gemini Model Warning] ${modelName} failed:`,
          error?.message ||
            error
        );

        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error(
        'No Gemini model could generate a response.'
      )
    );
  }

  /**
   * Build a robust conversation transcript.
   */
  private static buildConversationContext(
    databaseMessages: any[] = [],
    suppliedHistory: ProcessChatMessageInput['history'] =
      []
  ): string {
    const normalized = [
      ...suppliedHistory.map(
        (item: any) => ({
          role:
            item.role ===
              'assistant' ||
            item.role ===
              'model'
              ? 'ASSISTANT'
              : 'USER',
          text:
            item.parts
              ?.map(
                (part: any) =>
                  part.text
              )
              .join('') ||
            item.content ||
            item.message ||
            ''
        })
      ),
      ...databaseMessages.map(
        (item: any) => ({
          role:
            item.sender === 'ai' ||
            item.role ===
              'assistant' ||
            item.role ===
              'model'
              ? 'ASSISTANT'
              : 'USER',
          text:
            item.message ||
            item.content ||
            ''
        })
      )
    ];

    const deduplicated: Array<{
      role: string;
      text: string;
    }> = [];

    for (const item of normalized) {
      if (!item.text.trim()) {
        continue;
      }

      const previous =
        deduplicated[
          deduplicated.length -
            1
        ];

      if (
        previous &&
        previous.role ===
          item.role &&
        previous.text ===
          item.text
      ) {
        continue;
      }

      deduplicated.push(
        item
      );
    }

    return deduplicated
      .slice(-20)
      .map(
        (item) =>
          `${item.role}: ${item.text}`
      )
      .join('\n');
  }

  /**
   * Process a Tradara AI interaction.
   */
  public static async processMessage(
    input: ProcessChatMessageInput
  ) {
    const {
      itemId,
      buyerSession,
      buyerId,
      message,
      offeredPrice,
      quantity = 1,
      systemPrompt:
        customSystemPrompt,
      sessionId:
        explicitSessionId,
      history = []
    } = input;

    const cleanMessage =
      String(
        message || ''
      ).trim();

    if (!cleanMessage) {
      throw new Error(
        'Message cannot be empty.'
      );
    }

    const isGeneralSession =
      !itemId ||
      itemId ===
        'general-ai-session';

    let item: any = null;

    if (!isGeneralSession) {
      try {
        item =
          await (
            prisma as any
          ).item.findUnique({
            where: {
              id: itemId
            },
            include: {
              aiConfig: true,
              seller: true
            }
          });
      } catch (error) {
        console.warn(
          'Item lookup failed:',
          error
        );
      }
    }

    const dbItemId =
      isGeneralSession
        ? null
        : itemId;

    let session: any = null;

    if (explicitSessionId) {
      try {
        session =
          await (
            prisma as any
          ).aiNegotiationSession.findUnique(
            {
              where: {
                id: explicitSessionId
              },
              include: {
                messages: {
                  orderBy: {
                    createdAt:
                      'asc'
                  }
                }
              }
            }
          );
      } catch {
        session = null;
      }
    }

    if (!session && buyerId) {
      try {
        session =
          await (
            prisma as any
          ).aiNegotiationSession.findFirst(
            {
              where: {
                buyerId,
                itemId: dbItemId,
                status: 'active'
              },
              orderBy: {
                updatedAt:
                  'desc'
              },
              include: {
                messages: {
                  orderBy: {
                    createdAt:
                      'asc'
                  }
                }
              }
            }
          );
      } catch {
        session = null;
      }
    }

    if (
      !session &&
      buyerSession
    ) {
      try {
        session =
          await (
            prisma as any
          ).aiNegotiationSession.findFirst(
            {
              where: {
                buyerSession,
                itemId: dbItemId
              },
              orderBy: {
                updatedAt:
                  'desc'
              },
              include: {
                messages: {
                  orderBy: {
                    createdAt:
                      'asc'
                  }
                }
              }
            }
          );
      } catch {
        session = null;
      }
    }

    if (!session) {
      /*
       * IMPORTANT:
       * AiNegotiationSession does not have a "title" field in
       * prisma/schema.prisma.
       *
       * The item relation is connected conditionally so that:
       * - product conversations connect to the real Item record
       * - general AI conversations do not require an Item
       *
       * This avoids sending itemId directly to create(), which can
       * fail when the generated Prisma Client exposes the relation
       * through the "item" nested create input.
       */
      const sessionData: any = {
        buyerSession:
          buyerSession ||
          `anonymous_${Date.now()}`,
        buyerId:
          buyerId ||
          null,
        status:
          'active'
      };

      if (
        !isGeneralSession &&
        dbItemId
      ) {
        sessionData.item = {
          connect: {
            id: dbItemId
          }
        };
      }

      session =
        await (
          prisma as any
        ).aiNegotiationSession.create(
          {
            data: sessionData,
            include: {
              messages: true
            }
          }
        );
    } else if (
      buyerId &&
      !session.buyerId
    ) {
      await (
        prisma as any
      ).aiNegotiationSession.update(
        {
          where: {
            id: session.id
          },
          data: {
            buyerId
          }
        }
      );
    }

    const perception =
      this.perceiveBuyerIntent(
        cleanMessage,
        offeredPrice,
        item?.price || 0
      );

    const intelligence =
      await this.gatherMarketplaceIntelligence(
        itemId,
        buyerId
      );

    await (
      prisma as any
    ).aiChatMessage.create({
      data: {
        sessionId:
          session.id,
        sender: 'buyer',
        message:
          cleanMessage,
        offerMade:
          offeredPrice !==
          undefined
            ? offeredPrice
            : null
      }
    });

    if (
      session.status ===
        'transferred' ||
      session.status ===
        'human_agent'
    ) {
      const waitReply =
        'A live agent has received your message and will respond shortly.';

      const aiMessage =
        await (
          prisma as any
        ).aiChatMessage.create({
          data: {
            sessionId:
              session.id,
            sender:
              'system',
            message:
              waitReply
          }
        });

      return {
        sessionId:
          session.id,
        reply:
          waitReply,
        status:
          session.status,
        agreedPrice:
          session.agreedPrice,
        aiMessage,
        perception,
        intelligence
      };
    }

    const currentRound =
      (session.roundCount ||
        0) + 1;

    let rawAiReply = '';

    let dealStatus =
      session.status ||
      'active';

    let agreedPrice =
      session.agreedPrice;

    const isAutoNegotiateActive =
      Boolean(
        item &&
          item.aiConfig &&
          item.aiConfig
            .autoNegotiateEnabled
      );

    // ==========================================
    // Structured Product Offer
    // ==========================================

    if (
      offeredPrice !==
        undefined &&
      item
    ) {
      if (
        !isAutoNegotiateActive
      ) {
        rawAiReply =
          `Thank you for your offer of ${
            item.currency ||
            '₦'
          }${offeredPrice.toLocaleString()}. This item is currently listed at ${
            item.currency ||
            '₦'
          }${Number(
            item.price
          ).toLocaleString()}. The seller's automated negotiation is not enabled, so I cannot approve a discount automatically.`;
      } else {
        const result =
          NegotiationEngine.processOffer(
            offeredPrice,
            currentRound,
            {
              minimumPrice:
                item.aiConfig
                  .minimumPrice ||
                item.price,
              targetPrice:
                item.aiConfig
                  .targetPrice ||
                item.price,
              walkawayPrice:
                item.aiConfig
                  .walkawayPrice ||
                item.aiConfig
                  .minimumPrice ||
                item.price,
              discountStepPercent:
                item.aiConfig
                  .discountStepPercent ??
                5,
              maxDiscountRounds:
                item.aiConfig
                  .maxDiscountRounds ??
                3,
              autoNegotiateEnabled:
                item.aiConfig
                  .autoNegotiateEnabled,
              bulkMinQuantity:
                item.aiConfig
                  .bulkMinQuantity ||
                0,
              bulkDiscountPercent:
                item.aiConfig
                  .bulkDiscountPercent ||
                0,
              requestedQuantity:
                quantity
            }
          );

        dealStatus =
          result.status;

        if (result.accepted) {
          agreedPrice =
            offeredPrice;

          rawAiReply =
            `Great news! I can accept your offer of ${
              item.currency ||
              '₦'
            }${offeredPrice.toLocaleString()} per unit for ${quantity} unit(s). Would you like to proceed with the purchase?`;
        } else if (
          result.counterOffer
        ) {
          rawAiReply =
            `Thank you for your offer. The best price I can offer right now is ${
              item.currency ||
              '₦'
            }${result.counterOffer.toLocaleString()} per unit.`;
        } else {
          rawAiReply =
            result.message ||
            'I cannot accept that offer at this time.';
        }
      }
    } else {
      // ==========================================
      // General AI / Natural Language Layer
      // ==========================================

      const conversationContext =
        this.buildConversationContext(
          session.messages ||
            [],
          history
        );

      try {
        let systemInstruction =
          customSystemPrompt;

        if (!systemInstruction) {
          if (item) {
            const city =
              item.locationCity ||
              item.city ||
              item.seller?.city ||
              'Not specified';

            const area =
              item.locationArea ||
              item.area ||
              item.seller?.area ||
              'Not specified';

            const address =
              item.locationAddress ||
              item.pickupAddress ||
              item.seller?.address ||
              'Available through Tradara chat';

            systemInstruction = `
You are TRADARA AI, the intelligent assistant for the TRADARA marketplace.

You are currently assisting a customer with:
Product: ${
              item.stockName ||
              item.title ||
              'this product'
            }
Listed price: ${
              item.currency ||
              '₦'
            }${Number(
              item.price || 0
            ).toLocaleString()}
Category: ${
              item.category ||
              'Not specified'
            }

PRODUCT INFORMATION:
Description: ${
              item.description ||
              'Not specified'
            }
Specifications: ${
              item.aiConfig
                ?.specifications ||
              'Not specified'
            }
Condition: ${
              item.aiConfig
                ?.condition ||
              'Not specified'
            }
Warranty: ${
              item.aiConfig
                ?.warrantyPeriod ||
              'Not specified'
            }
FAQ: ${
              item.aiConfig
                ?.faqKnowledgeBase ||
              'Not specified'
            }

LOCATION:
City: ${city}
Area: ${area}
Pickup details: ${address}

NEGOTIATION INFORMATION:
Minimum automated price: ${
              item.currency ||
              '₦'
            }${Number(
              item.aiConfig
                ?.minimumPrice ||
                item.price ||
                0
            ).toLocaleString()}
Target price: ${
              item.currency ||
              '₦'
            }${Number(
              item.aiConfig
                ?.targetPrice ||
                item.price ||
                0
            ).toLocaleString()}
Bulk minimum: ${
              item.aiConfig
                ?.bulkMinQuantity ||
              'Not configured'
            }

RULES:
- Answer product questions using the supplied product information.
- Never invent specifications, warranty terms, location details, stock information, or seller promises.
- If information is unavailable, say that it is not provided.
- Do not expose private seller information.
- Respect the configured negotiation floor.
- If the user asks a general question unrelated to this product, answer it normally and helpfully rather than forcing it into e-commerce.
- Do not claim that you executed an action unless an actual tool execution result confirms it.
- Be natural, intelligent and conversational.
- Use Markdown when it improves clarity.
`;
          } else {
            systemInstruction = `
You are TRADARA AI, a general-purpose intelligent assistant integrated into the TRADARA marketplace.

You are a genuine general-purpose AI assistant, not merely a sales bot or product FAQ system.

You can:
- Answer general knowledge questions.
- Explain concepts at beginner, intermediate or advanced levels.
- Solve mathematics and logic problems.
- Write, explain, review and debug code.
- Help with JavaScript, TypeScript, React, Node.js, APIs, databases and software architecture.
- Discuss science, technology, history, business and education.
- Help users plan and reason through complex tasks.
- Explain marketplace concepts and product information when supplied.
- Help users formulate better questions and decisions.
- Maintain conversational context.
- Use available tools when the backend actually exposes and authorizes those tools.

IMPORTANT:
- Answer the user's actual question directly.
- Do not force every question into e-commerce.
- Do not use generic filler.
- Do not pretend a tool was executed when it was not.
- Do not pretend to have searched the web unless an actual search tool was executed.
- If you do not know something, say so clearly.
- For code, provide practical code and explain important details.
- For mathematics, calculate carefully and show useful reasoning.
- For ambiguous requests, ask a focused clarification only when it is genuinely necessary.
- Be conversational rather than repetitive.
- Use Markdown naturally.
`;
          }
        }

        const response =
          await this.generateWithModelFallback(
            {
              contents: `${
                conversationContext
                  ? `CONVERSATION CONTEXT:\n${conversationContext}\n\n`
                  : ''
              }CURRENT USER MESSAGE:\n${cleanMessage}`,
              config: {
                systemInstruction,
                maxOutputTokens:
                  2048
              }
            }
          );

        rawAiReply =
          response.text || '';
      } catch (error) {
        console.error(
          'Gemini AI Processing Error:',
          error
        );

        throw new Error(
          'The AI model could not generate a response.'
        );
      }
    }

    const aiReply =
      this.sanitizeMarkdownOutput(
        rawAiReply
      ) ||
      'I was unable to generate a response for that request. Please try again.';

    await (
      prisma as any
    ).aiNegotiationSession.update(
      {
        where: {
          id: session.id
        },
        data: {
          roundCount:
            currentRound,
          currentOffer:
            offeredPrice !==
            undefined
              ? offeredPrice
              : session.currentOffer,
          agreedPrice:
            agreedPrice ||
            session.agreedPrice,
          status:
            dealStatus,
          updatedAt:
            new Date()
        }
      }
    );

    const aiMessage =
      await (
        prisma as any
      ).aiChatMessage.create({
        data: {
          sessionId:
            session.id,
          sender: 'ai',
          message:
            aiReply,
          offerMade:
            agreedPrice ||
            null
        }
      });

    void this.recordInteractionLearning(
      session.id,
      cleanMessage,
      aiReply,
      perception,
      dealStatus
    );

    return {
      sessionId:
        session.id,
      reply:
        aiReply,
      status:
        dealStatus,
      agreedPrice,
      aiMessage,
      perception,
      intelligence
    };
  }

  /**
   * Allow switching session status.
   */
  public static async updateSessionStatus(
    sessionId: string,
    status:
      | 'active'
      | 'transferred'
      | 'closed'
      | 'human_agent'
  ) {
    return await (
      prisma as any
    ).aiNegotiationSession.update(
      {
        where: {
          id: sessionId
        },
        data: {
          status
        }
      }
    );
  }
}