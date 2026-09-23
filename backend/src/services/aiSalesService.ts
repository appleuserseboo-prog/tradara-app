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

// ==========================================
// Types
// ==========================================

export interface AiSalesToolDefinition {
  name: string;
  description: string;
  riskLevel?: string;
  requiresApproval?: boolean;
  parameters?: any;
}

export interface AiSalesToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  requiresApproval?: boolean;
  riskLevel?: string;
}

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

  /**
   * Optional agent tools supplied by the orchestration layer.
   *
   * This service is intentionally capable of exposing structured
   * Gemini function calls without directly executing them.
   *
   * The orchestrator remains responsible for:
   * - authorization
   * - approval
   * - actual tool execution
   * - tool result injection
   */
  agentTools?: AiSalesToolDefinition[];

  /**
   * Optional tool result context supplied by a future orchestration
   * pass after a tool has executed.
   */
  toolResults?: Array<{
    callId?: string;
    name: string;
    result?: any;
    error?: string;
    success?: boolean;
  }>;
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

// ==========================================
// Gemini response helpers
// ==========================================

interface ParsedGeminiResponse {
  text: string;
  toolCalls: AiSalesToolCall[];
}

// ==========================================
// AI Sales Service
// ==========================================

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
   * Convert Tradara tool definitions into Gemini function declarations.
   *
   * The parameters are intentionally passed as `any` because the
   * application supports multiple tool-schema representations and
   * @google/genai versions can differ in their TypeScript declarations.
   */
  private static buildGeminiToolDeclarations(
    tools: AiSalesToolDefinition[] = []
  ): any[] {
    if (!Array.isArray(tools)) {
      return [];
    }

    const declarations: any[] = [];

    const seen = new Set<string>();

    for (const tool of tools) {
      if (!tool) {
        continue;
      }

      const name =
        typeof tool.name === 'string'
          ? tool.name.trim()
          : '';

      if (!name) {
        continue;
      }

      if (seen.has(name)) {
        continue;
      }

      seen.add(name);

      const description =
        typeof tool.description === 'string' &&
        tool.description.trim()
          ? tool.description.trim()
          : `Execute the ${name} tool.`;

      let parameters =
        tool.parameters;

      if (
        !parameters ||
        typeof parameters !== 'object'
      ) {
        parameters = {
          type: 'object',
          properties: {}
        };
      }

      declarations.push({
        name,
        description,
        parameters
      });
    }

    return declarations;
  }

  /**
   * Build tool execution context that can be injected into the
   * model conversation after an orchestrator executes a tool.
   */
  private static buildToolResultContext(
    toolResults: ProcessChatMessageInput['toolResults'] = []
  ): string {
    if (
      !Array.isArray(toolResults) ||
      toolResults.length === 0
    ) {
      return '';
    }

    const lines: string[] = [
      'TOOL EXECUTION RESULTS:',
      'The following results were returned by tools actually executed by the application.'
    ];

    for (const toolResult of toolResults) {
      if (!toolResult) {
        continue;
      }

      lines.push(
        `Tool: ${toolResult.name || 'unknown'}`
      );

      if (
        toolResult.callId
      ) {
        lines.push(
          `Call ID: ${toolResult.callId}`
        );
      }

      lines.push(
        `Success: ${
          toolResult.success === true
            ? 'true'
            : toolResult.success === false
            ? 'false'
            : 'unknown'
        }`
      );

      if (
        toolResult.error
      ) {
        lines.push(
          `Error: ${toolResult.error}`
        );
      }

      if (
        toolResult.result !==
        undefined
      ) {
        let serialized = '';

        try {
          serialized =
            typeof toolResult.result ===
            'string'
              ? toolResult.result
              : JSON.stringify(
                  toolResult.result
                );
        } catch {
          serialized =
            String(
              toolResult.result
            );
        }

        lines.push(
          `Result: ${serialized}`
        );
      }

      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Extract structured function calls from a Gemini response.
   *
   * The SDK exposes functionCalls() on some versions. Other versions
   * expose functionCall parts inside candidates. This implementation
   * supports both shapes so the service is more resilient.
   */
  private static extractToolCalls(
    response: any
  ): AiSalesToolCall[] {
    const calls: AiSalesToolCall[] = [];
    const seen = new Set<string>();

    const addCall = (
      rawCall: any
    ): void => {
      if (!rawCall) {
        return;
      }

      const name =
        rawCall.name ||
        rawCall.functionCall?.name;

      if (
        typeof name !== 'string' ||
        !name.trim()
      ) {
        return;
      }

      const rawArguments =
        rawCall.args ??
        rawCall.arguments ??
        rawCall.functionCall?.args ??
        rawCall.functionCall?.arguments ??
        {};

      let args: Record<string, any> = {};

      if (
        rawArguments &&
        typeof rawArguments ===
          'object' &&
        !Array.isArray(rawArguments)
      ) {
        args = rawArguments;
      } else if (
        typeof rawArguments ===
        'string'
      ) {
        try {
          const parsed =
            JSON.parse(
              rawArguments
            );

          if (
            parsed &&
            typeof parsed ===
              'object' &&
            !Array.isArray(parsed)
          ) {
            args = parsed;
          }
        } catch {
          args = {};
        }
      }

      const callId =
        rawCall.id ||
        rawCall.callId ||
        `tool_call_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      const normalizedId =
        String(callId);

      const duplicateKey =
        `${normalizedId}:${name}`;

      if (
        seen.has(duplicateKey)
      ) {
        return;
      }

      seen.add(duplicateKey);

      calls.push({
        id: normalizedId,
        name: name.trim(),
        arguments: args
      });
    };

    try {
      if (
        typeof response?.functionCalls ===
        'function'
      ) {
        const functionCalls =
          response.functionCalls();

        if (
          Array.isArray(
            functionCalls
          )
        ) {
          for (
            const call of functionCalls
          ) {
            addCall(call);
          }
        }
      }
    } catch (error) {
      console.warn(
        '[Gemini] Could not read functionCalls():',
        error
      );
    }

    const candidates =
      Array.isArray(
        response?.candidates
      )
        ? response.candidates
        : [];

    for (const candidate of candidates) {
      const parts =
        Array.isArray(
          candidate?.content?.parts
        )
          ? candidate.content.parts
          : [];

      for (const part of parts) {
        if (
          part?.functionCall
        ) {
          addCall(
            part.functionCall
          );
        }

        if (
          part?.function_call
        ) {
          addCall(
            part.function_call
          );
        }
      }
    }

    return calls;
  }

  /**
   * Extract text while safely ignoring function-call-only parts.
   */
  private static extractResponseText(
    response: any
  ): string {
    if (
      typeof response?.text ===
      'string'
    ) {
      return response.text;
    }

    const textParts: string[] = [];

    const candidates =
      Array.isArray(
        response?.candidates
      )
        ? response.candidates
        : [];

    for (const candidate of candidates) {
      const parts =
        Array.isArray(
          candidate?.content?.parts
        )
          ? candidate.content.parts
          : [];

      for (const part of parts) {
        if (
          typeof part?.text ===
          'string'
        ) {
          textParts.push(
            part.text
          );
        }
      }
    }

    return textParts.join('\n');
  }

  /**
   * Parse the Gemini response into:
   * - normal assistant text
   * - structured tool calls
   */
  private static parseGeminiResponse(
    response: any
  ): ParsedGeminiResponse {
    const toolCalls =
      this.extractToolCalls(
        response
      );

    const text =
      this.extractResponseText(
        response
      );

    return {
      text,
      toolCalls
    };
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
      history = [],
      agentTools = [],
      toolResults = []
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
        intelligence,
        toolCalls: []
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

    let structuredToolCalls:
      AiSalesToolCall[] = [];

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

        // ==========================================
        // Agent Tool Instructions
        // ==========================================

        if (
          Array.isArray(
            agentTools
          ) &&
          agentTools.length > 0
        ) {
          const toolNames =
            agentTools
              .map(
                (tool) =>
                  tool?.name
              )
              .filter(
                Boolean
              );

          systemInstruction += `

AVAILABLE AGENT TOOLS:
${agentTools
  .map(
    (tool) =>
      `- ${tool.name}: ${
        tool.description ||
        'No description supplied.'
      }${
        tool.riskLevel
          ? ` [risk=${tool.riskLevel}]`
          : ''
      }${
        tool.requiresApproval
          ? ' [requires approval]'
          : ''
      }`
  )
  .join('\n')}

TOOL USAGE RULES:
- Use a tool when the user's request requires information or an action that the tool is designed to provide.
- Do not invent tool results.
- Do not claim a tool was executed merely because you requested it.
- Read-only tools may be used when genuinely useful.
- Sensitive or external actions may require approval.
- If a tool is unavailable, explain what information is missing.
- Do not use tools for ordinary questions that can be answered directly.
- Prefer the most specific available tool.
- Never expose API keys, authentication tokens, internal permissions or private system data.

REGISTERED TOOL NAMES:
${toolNames.join(', ')}
`;
        }

        const toolResultContext =
          this.buildToolResultContext(
            toolResults
          );

        const contentsParts: string[] =
          [];

        if (
          conversationContext
        ) {
          contentsParts.push(
            `CONVERSATION CONTEXT:\n${conversationContext}`
          );
        }

        if (
          toolResultContext
        ) {
          contentsParts.push(
            toolResultContext
          );
        }

        contentsParts.push(
          `CURRENT USER MESSAGE:\n${cleanMessage}`
        );

        const geminiTools =
          this.buildGeminiToolDeclarations(
            agentTools
          );

        const generationConfig: any = {
          systemInstruction,
          maxOutputTokens:
            2048
        };

        /*
         * Only attach the tools configuration when actual tools
         * were supplied. This preserves the old behavior for the
         * existing controller route and general AI calls.
         */
        if (
          geminiTools.length > 0
        ) {
          generationConfig.tools = [
            {
              functionDeclarations:
                geminiTools
            }
          ];
        }

        const response =
          await this.generateWithModelFallback(
            {
              contents:
                contentsParts.join(
                  '\n\n'
                ),
              config:
                generationConfig
            }
          );

        const parsed =
          this.parseGeminiResponse(
            response
          );

        structuredToolCalls =
          parsed.toolCalls;

        rawAiReply =
          parsed.text || '';

        /*
         * Attach metadata to the returned tool calls without
         * allowing the model to decide its own permissions.
         *
         * Actual authorization is still performed by the
         * orchestrator/tool registry.
         */
        if (
          structuredToolCalls.length >
          0
        ) {
          structuredToolCalls =
            structuredToolCalls.map(
              (call) => {
                const definition =
                  agentTools.find(
                    (tool) =>
                      tool.name ===
                      call.name
                  );

                return {
                  ...call,
                  requiresApproval:
                    Boolean(
                      definition?.requiresApproval
                    ),
                  riskLevel:
                    definition?.riskLevel
                };
              }
            );
        }
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

    /*
     * When Gemini returns tool calls, the model may not return
     * ordinary text. That is intentional.
     *
     * The orchestrator can now inspect `toolCalls`, execute the
     * authorized tools, and send their results back into this
     * service on the next pass.
     */
    const hasToolCalls =
      structuredToolCalls.length >
      0;

    const sanitizedReply =
      this.sanitizeMarkdownOutput(
        rawAiReply
      );

    const aiReply =
      sanitizedReply ||
      (
        hasToolCalls
          ? ''
          : 'I was unable to generate a response for that request. Please try again.'
      );

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

    /*
     * Do not persist an empty assistant message when Gemini only
     * returned structured tool calls.
     *
     * This prevents the database from containing blank AI bubbles
     * while the orchestrator is waiting to execute the tool.
     */
    let aiMessage: any = null;

    if (aiReply) {
      aiMessage =
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
    }

    /*
     * Learning should only record an actual natural-language
     * response. Tool calls are execution requests, not completed
     * actions, so they must not be falsely recorded as completed
     * AI outcomes.
     */
    if (aiReply) {
      void this.recordInteractionLearning(
        session.id,
        cleanMessage,
        aiReply,
        perception,
        dealStatus
      );
    }

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
      intelligence,

      /*
       * Structured tool calls produced by Gemini.
       *
       * The existing orchestrator currently does not consume these
       * dynamically yet. They are returned here so the next
       * orchestrator upgrade can execute them through the existing
       * Tradara ToolRegistry with permissions and approval controls.
       */
      toolCalls:
        structuredToolCalls,

      /*
       * Useful signal for the orchestration layer.
       */
      requiresToolExecution:
        hasToolCalls
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