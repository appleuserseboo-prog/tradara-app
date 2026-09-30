// ==========================================
// FILE: backend/src/services/aiSalesService.ts
// TRADARA AI — Resilient AI Sales + General AI Service
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

interface GeminiGenerationResult {
  response: any;
  model: string;
}

interface GeminiModelHealth {
  consecutiveFailures: number;
  lastFailureAt: number;
  cooldownUntil: number;
}

// ==========================================
// AI Sales Service
// ==========================================

export class AiSalesService {
  // ==========================================
  // Gemini resilience configuration
  // ==========================================

  /**
   * Runtime health state for individual Gemini models.
   *
   * This prevents Tradara from repeatedly hammering a model that
   * has just returned a transient provider failure.
   */
  private static readonly geminiModelHealth =
    new Map<string, GeminiModelHealth>();

  /**
   * Last model successfully used by this process.
   *
   * This is mainly useful for diagnostics and response metadata.
   */
  private static lastSuccessfulGeminiModel =
    '';

  /**
   * Helper function to sanitize AI responses without destroying
   * legitimate Markdown structure.
   */
  private static sanitizeResponse(
    text: string
  ): string {
    if (!text) {
      return '';
    }

    return String(text)
      .replace(/\r\n/g, '\n')
      .replace(/\u0000/g, '')
      .trim();
  }

  /**
   * Detect buyer perception from a message.
   */
  private static perceiveBuyerIntent(
    message: string
  ): BuyerPerception {
    const normalized =
      String(message || '')
        .trim()
        .toLowerCase();

    const hasAny = (
      words: string[]
    ) =>
      words.some((word) =>
        normalized.includes(word)
      );

    let sentiment:
      | 'positive'
      | 'neutral'
      | 'negative'
      | 'frustrated'
      | 'eager' =
      'neutral';

    if (
      hasAny([
        'angry',
        'annoyed',
        'ridiculous',
        'terrible',
        'worst',
        'scam',
        'not happy'
      ])
    ) {
      sentiment = 'frustrated';
    } else if (
      hasAny([
        'love',
        'great',
        'perfect',
        'nice',
        'good',
        'interested',
        'i want',
        'i like'
      ])
    ) {
      sentiment = 'positive';
    } else if (
      hasAny([
        'buy now',
        'take it',
        'send',
        'checkout',
        'ready',
        'i will buy',
        'i want to buy'
      ])
    ) {
      sentiment = 'eager';
    } else if (
      hasAny([
        'no',
        'cannot',
        'cant',
        "can't",
        'too expensive',
        'not affordable',
        'bad'
      ])
    ) {
      sentiment = 'negative';
    }

    const urgency =
      hasAny([
        'urgent',
        'today',
        'now',
        'asap',
        'immediately',
        'quickly'
      ])
        ? 'high'
        : hasAny([
            'soon',
            'this week',
            'tomorrow'
          ])
        ? 'medium'
        : 'low';

    const priceSensitivity =
      hasAny([
        'cheap',
        'cheaper',
        'discount',
        'reduce',
        'lower',
        'last price',
        'best price',
        'lowest',
        'budget',
        'afford',
        'expensive',
        'negotiate',
        'bargain',
        'offer'
      ])
        ? 'high'
        : hasAny([
            'price',
            'cost',
            'how much'
          ])
        ? 'medium'
        : 'low';

    let detectedIntent:
      | 'inquiry'
      | 'bargain'
      | 'specs_check'
      | 'human_request'
      | 'bulk_inquiry'
      | 'closing'
      | 'general' =
      'general';

    if (
      hasAny([
        'human',
        'agent',
        'person',
        'seller',
        'representative',
        'talk to someone'
      ])
    ) {
      detectedIntent = 'human_request';
    } else if (
      hasAny([
        'bulk',
        'wholesale',
        'quantity',
        'pieces',
        'units',
        'how many'
      ])
    ) {
      detectedIntent = 'bulk_inquiry';
    } else if (
      hasAny([
        'buy',
        'purchase',
        'checkout',
        'payment',
        'take it',
        'deal'
      ])
    ) {
      detectedIntent = 'closing';
    } else if (
      hasAny([
        'spec',
        'specification',
        'size',
        'colour',
        'color',
        'material',
        'condition',
        'warranty',
        'feature',
        'features'
      ])
    ) {
      detectedIntent = 'specs_check';
    } else if (
      hasAny([
        'negotiate',
        'discount',
        'reduce',
        'lower',
        'offer',
        'cheaper',
        'last price',
        'best price',
        'bargain'
      ])
    ) {
      detectedIntent = 'bargain';
    } else if (
      hasAny([
        'price',
        'cost',
        'how much',
        'available',
        'availability'
      ])
    ) {
      detectedIntent = 'inquiry';
    }

    const budgetMatch =
      normalized.match(
        /(?:₦|ngn|n)\s?([0-9][0-9,]*(?:\.[0-9]+)?)/i
      );

    const estimatedMaxBudget =
      budgetMatch
        ? Number(
            budgetMatch[1].replace(
              /,/g,
              ''
            )
          )
        : undefined;

    return {
      sentiment,
      urgency,
      priceSensitivity,
      detectedIntent,
      estimatedMaxBudget
    };
  }

  /**
   * Gather marketplace intelligence.
   *
   * IMPORTANT:
   * aiNegotiationSession uses Prisma relations for Item and Buyer.
   * Do not use scalar itemId/buyerId fields when the schema exposes
   * only the relation fields.
   */
  private static async gatherMarketplaceIntelligence(
    itemId?: string,
    buyerId?: string
  ): Promise<MarketplaceIntelligence> {
    try {
      let itemHistoricalConversions = 0;
      let averageAgreedDiscountPercent = 0;

      if (itemId) {
        const sessions =
          await (prisma as any)
            .aiNegotiationSession.findMany({
              where: {
                item: {
                  is: {
                    id: itemId
                  }
                },
                status: 'agreed'
              },
              take: 200
            });

        itemHistoricalConversions =
          sessions.length;

        if (
          sessions.length > 0
        ) {
          const discounts =
            sessions
              .map(
                (session: any) => {
                  const listed =
                    Number(
                      session.listedPrice ??
                        session.originalPrice ??
                        0
                    );

                  const agreed =
                    Number(
                      session.agreedPrice ??
                        session.finalPrice ??
                        0
                    );

                  if (
                    listed <= 0 ||
                    agreed <= 0
                  ) {
                    return 0;
                  }

                  return Math.max(
                    0,
                    ((listed -
                      agreed) /
                      listed) *
                      100
                  );
                }
              )
              .filter(
                (value: number) =>
                  Number.isFinite(
                    value
                  )
              );

          if (
            discounts.length > 0
          ) {
            averageAgreedDiscountPercent =
              discounts.reduce(
                (
                  total: number,
                  value: number
                ) =>
                  total + value,
                0
              ) /
              discounts.length;
          }
        }
      }

      let buyerPastNegotiationCount =
        0;

      let buyerSuccessfulDeals =
        0;

      if (buyerId) {
        const buyerSessions =
          await (prisma as any)
            .aiNegotiationSession.findMany(
              {
                where: {
                  buyer: {
                    is: {
                      id: buyerId
                    }
                  }
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
            timestamp:
              new Date()
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
   */
  private static buildGeminiToolDeclarations(
    tools: AiSalesToolDefinition[] = []
  ): any[] {
    if (!Array.isArray(tools)) {
      return [];
    }

    const declarations: any[] = [];
    const seen =
      new Set<string>();

    for (const tool of tools) {
      if (!tool) {
        continue;
      }

      const name =
        typeof tool.name ===
        'string'
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
        typeof tool.description ===
          'string' &&
        tool.description.trim()
          ? tool.description.trim()
          : `Execute Tradara tool ${name}.`;

      const declaration: any = {
        name,
        description
      };

      if (tool.parameters) {
        declaration.parameters =
          tool.parameters;
      } else {
        declaration.parameters = {
          type: 'object',
          properties: {}
        };
      }

      declarations.push(
        declaration
      );
    }

    return declarations;
  }

  /**
   * Convert executed tool results into model-readable context.
   */
  private static buildToolResultContext(
    toolResults: ProcessChatMessageInput['toolResults'] =
      []
  ): string {
    if (
      !Array.isArray(toolResults) ||
      toolResults.length === 0
    ) {
      return '';
    }

    const safeResults =
      toolResults.map(
        (toolResult) => ({
          callId:
            toolResult.callId,
          tool:
            toolResult.name,
          success:
            toolResult.success !==
            false,
          result:
            toolResult.result,
          error:
            toolResult.error
        })
      );

    return `
REAL BACKEND TOOL RESULTS

The following results came from actual backend tool execution.

${JSON.stringify(
  safeResults,
  null,
  2
)}

IMPORTANT:
- Treat these results as authoritative for the corresponding operations.
- Do not claim a tool executed if there is no corresponding successful result.
- Do not invent fields or values that are absent from the results.
- If a tool failed, explain the failure honestly.
`;
  }

  /**
   * Extract Gemini function calls from multiple response shapes.
   */
  private static extractToolCalls(
    response: any
  ): AiSalesToolCall[] {
    const calls: AiSalesToolCall[] =
      [];

    const seen =
      new Set<string>();

    const addCall = (
      call: any
    ) => {
      if (!call) {
        return;
      }

      const name =
        typeof call.name ===
        'string'
          ? call.name.trim()
          : '';

      if (!name) {
        return;
      }

      const args =
        call.args &&
        typeof call.args ===
          'object'
          ? call.args
          : call.arguments &&
              typeof call.arguments ===
                'object'
          ? call.arguments
          : {};

      const id =
        typeof call.id ===
        'string'
          ? call.id
          : `call_${name}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`;

      const duplicateKey =
        `${id}:${name}`;

      if (
        seen.has(
          duplicateKey
        )
      ) {
        return;
      }

      seen.add(
        duplicateKey
      );

      calls.push({
        id,
        name,
        arguments:
          args
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
          for (const call of functionCalls) {
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
   * Extract response text while safely ignoring function-call-only parts.
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

    const textParts: string[] =
      [];

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

    return textParts.join(
      '\n'
    );
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

  // ==========================================
  // Gemini provider resilience helpers
  // ==========================================

  /**
   * Convert an unknown error into a readable string.
   */
  private static getGeminiErrorMessage(
    error: any
  ): string {
    if (
      typeof error ===
      'string'
    ) {
      return error;
    }

    if (
      typeof error?.message ===
      'string'
    ) {
      return error.message;
    }

    try {
      return JSON.stringify(
        error
      );
    } catch {
      return String(
        error
      );
    }
  }

  /**
   * Extract a provider/network status code from different
   * Google SDK / fetch / HTTP error shapes.
   */
  private static getGeminiErrorStatus(
    error: any
  ): number | undefined {
    const candidates = [
      error?.status,
      error?.statusCode,
      error?.code,
      error?.response?.status,
      error?.response?.statusCode,
      error?.cause?.status,
      error?.cause?.statusCode
    ];

    for (const candidate of candidates) {
      const numeric =
        Number(candidate);

      if (
        Number.isFinite(
          numeric
        ) &&
        numeric >= 100 &&
        numeric <= 599
      ) {
        return numeric;
      }
    }

    const message =
      this.getGeminiErrorMessage(
        error
      ).toLowerCase();

    const statusMatch =
      message.match(
        /\b(408|429|500|502|503|504)\b/
      );

    if (statusMatch) {
      return Number(
        statusMatch[1]
      );
    }

    return undefined;
  }

  /**
   * Determine whether an error is likely transient.
   *
   * These failures are safe candidates for retrying:
   * - 408 request timeout
   * - 429 rate limit
   * - 500 internal server error
   * - 502 bad gateway
   * - 503 service unavailable / overload
   * - 504 gateway timeout
   * - network/fetch failures
   * - connection resets
   * - explicit timeout failures
   */
  private static isTransientGeminiError(
    error: any
  ): boolean {
    const status =
      this.getGeminiErrorStatus(
        error
      );

    if (
      status === 408 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    ) {
      return true;
    }

    const message =
      this.getGeminiErrorMessage(
        error
      ).toLowerCase();

    const transientPatterns = [
      'high demand',
      'service unavailable',
      'temporarily unavailable',
      'unavailable',
      'overloaded',
      'overload',
      'rate limit',
      'rate_limit',
      'too many requests',
      'resource exhausted',
      'resource_exhausted',
      'quota exceeded',
      'quota_exceeded',
      'fetch failed',
      'network error',
      'networkerror',
      'connection reset',
      'connection refused',
      'socket hang up',
      'econnreset',
      'econnrefused',
      'etimedout',
      'timeout',
      'timed out',
      'gateway',
      'temporary failure',
      'temporarily failing'
    ];

    return transientPatterns.some(
      (pattern) =>
        message.includes(
          pattern
        )
    );
  }

  /**
   * Read a positive integer environment variable safely.
   */
  private static readPositiveIntegerEnv(
    name: string,
    fallback: number,
    min: number,
    max: number
  ): number {
    const raw =
      Number(
        process.env[name]
      );

    if (
      !Number.isFinite(
        raw
      )
    ) {
      return fallback;
    }

    return Math.min(
      max,
      Math.max(
        min,
        Math.floor(raw)
      )
    );
  }

  /**
   * Wait for a number of milliseconds.
   */
  private static async sleep(
    milliseconds: number
  ): Promise<void> {
    if (
      milliseconds <= 0
    ) {
      return;
    }

    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds
        );
      }
    );
  }

  /**
   * Exponential backoff with jitter.
   *
   * Example:
   * retry 1 ≈ 500-1000ms
   * retry 2 ≈ 1000-2000ms
   * retry 3 ≈ 2000-4000ms
   */
  private static calculateRetryDelay(
    retryNumber: number,
    baseDelayMs: number,
    maxDelayMs: number
  ): number {
    const exponent =
      Math.max(
        0,
        retryNumber - 1
      );

    const exponentialDelay =
      Math.min(
        maxDelayMs,
        baseDelayMs *
          Math.pow(
            2,
            exponent
          )
      );

    const jitter =
      Math.floor(
        Math.random() *
          Math.max(
            100,
            Math.floor(
              exponentialDelay *
                0.5
            )
          )
      );

    return Math.min(
      maxDelayMs,
      exponentialDelay +
        jitter
    );
  }

  /**
   * Get current model health.
   */
  private static getModelHealth(
    modelName: string
  ): GeminiModelHealth {
    const existing =
      this.geminiModelHealth.get(
        modelName
      );

    if (existing) {
      return existing;
    }

    const fresh: GeminiModelHealth =
      {
        consecutiveFailures: 0,
        lastFailureAt: 0,
        cooldownUntil: 0
      };

    this.geminiModelHealth.set(
      modelName,
      fresh
    );

    return fresh;
  }

  /**
   * Check whether a model is currently cooling down.
   */
  private static isModelCoolingDown(
    modelName: string,
    now: number = Date.now()
  ): boolean {
    const health =
      this.getModelHealth(
        modelName
      );

    return (
      health.cooldownUntil >
      now
    );
  }

  /**
   * Mark a model as successful.
   */
  private static markModelSuccess(
    modelName: string
  ): void {
    this.geminiModelHealth.set(
      modelName,
      {
        consecutiveFailures: 0,
        lastFailureAt: 0,
        cooldownUntil: 0
      }
    );

    this.lastSuccessfulGeminiModel =
      modelName;
  }

  /**
   * Mark a model as failed.
   *
   * The cooldown grows with consecutive failures but is bounded.
   */
  private static markModelFailure(
    modelName: string,
    cooldownBaseMs: number,
    cooldownMaxMs: number
  ): void {
    const previous =
      this.getModelHealth(
        modelName
      );

    const consecutiveFailures =
      previous.consecutiveFailures +
      1;

    const cooldown =
      Math.min(
        cooldownMaxMs,
        cooldownBaseMs *
          Math.pow(
            2,
            Math.min(
              consecutiveFailures -
                1,
              5
            )
          )
      );

    const now =
      Date.now();

    this.geminiModelHealth.set(
      modelName,
      {
        consecutiveFailures,
        lastFailureAt:
          now,
        cooldownUntil:
          now + cooldown
      }
    );

    console.warn(
      `[Gemini] Model ${modelName} placed on cooldown for ${cooldown}ms after ${consecutiveFailures} consecutive failure(s).`
    );
  }

  /**
   * Determine whether a model is configured in a safe way.
   *
   * If GEMINI_MODEL is invalid, we do not allow it to replace the
   * complete fallback chain.
   */
  private static buildGeminiModelList(): string[] {
    const configuredModel =
      (
        process.env.GEMINI_MODEL ||
        ''
      ).trim();

    /**
     * Current stable model rotation.
     *
     * gemini-3.5-flash-lite is intentionally included because it
     * is designed for high-throughput/cost-effective workloads and
     * gives Tradara another independent model option when a larger
     * Flash model is under heavy demand.
     */
    const supportedModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash'
    ];

    const modelsToTry: string[] =
      [];

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

    return modelsToTry;
  }

  /**
   * Execute one Gemini model request with a hard timeout.
   *
   * The SDK promise itself is not cancelled here because cancellation
   * support differs between SDK versions. The timeout still prevents
   * Tradara's request from waiting indefinitely.
   */
  private static async executeGeminiModelRequest(
    modelName: string,
    params: {
      contents: any;
      config?: any;
    },
    timeoutMs: number
  ): Promise<any> {
    let timeoutHandle:
      ReturnType<typeof setTimeout> |
      undefined;

    try {
      const generationPromise =
        ai.models.generateContent({
          model:
            modelName,
          contents:
            params.contents,
          config:
            params.config
        });

      const timeoutPromise =
        new Promise<never>(
          (
            _resolve,
            reject
          ) => {
            timeoutHandle =
              setTimeout(
                () => {
                  const timeoutError =
                    new Error(
                      `Gemini model ${modelName} timed out after ${timeoutMs}ms.`
                    );

                  (
                    timeoutError as any
                  ).code =
                    'GEMINI_TIMEOUT';

                  reject(
                    timeoutError
                  );
                },
                timeoutMs
              );
          }
        );

      return await Promise.race([
        generationPromise,
        timeoutPromise
      ]);
    } finally {
      if (
        timeoutHandle
      ) {
        clearTimeout(
          timeoutHandle
        );
      }
    }
  }

  /**
   * Generate content with a resilient Gemini model fallback.
   *
   * Phase 2 provider-resilience behavior:
   *
   * 1. preferred model first
   * 2. model rotation
   * 3. retry transient errors
   * 4. exponential backoff
   * 5. jitter
   * 6. per-model cooldown
   * 7. per-attempt timeout
   * 8. overall request deadline
   * 9. automatic fallback to another supported model
   *
   * Environment variables:
   *
   * GEMINI_MODEL
   * GEMINI_TIMEOUT_MS
   * GEMINI_TOTAL_TIMEOUT_MS
   * GEMINI_MAX_RETRIES
   * GEMINI_RETRY_BASE_DELAY_MS
   * GEMINI_RETRY_MAX_DELAY_MS
   * GEMINI_MODEL_COOLDOWN_MS
   * GEMINI_MODEL_COOLDOWN_MAX_MS
   */
  private static async generateWithModelFallback(
    params: {
      contents: any;
      config?: any;
    }
  ): Promise<GeminiGenerationResult> {
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured.'
      );
    }

    const modelsToTry =
      this.buildGeminiModelList();

    if (
      modelsToTry.length === 0
    ) {
      throw new Error(
        'No supported Gemini models are configured.'
      );
    }

    const timeoutMs =
      this.readPositiveIntegerEnv(
        'GEMINI_TIMEOUT_MS',
        45000,
        5000,
        120000
      );

    const totalTimeoutMs =
      this.readPositiveIntegerEnv(
        'GEMINI_TOTAL_TIMEOUT_MS',
        120000,
        10000,
        300000
      );

    const maxRetries =
      this.readPositiveIntegerEnv(
        'GEMINI_MAX_RETRIES',
        2,
        0,
        5
      );

    const retryBaseDelayMs =
      this.readPositiveIntegerEnv(
        'GEMINI_RETRY_BASE_DELAY_MS',
        750,
        100,
        10000
      );

    const retryMaxDelayMs =
      this.readPositiveIntegerEnv(
        'GEMINI_RETRY_MAX_DELAY_MS',
        8000,
        500,
        30000
      );

    const modelCooldownMs =
      this.readPositiveIntegerEnv(
        'GEMINI_MODEL_COOLDOWN_MS',
        15000,
        1000,
        120000
      );

    const modelCooldownMaxMs =
      this.readPositiveIntegerEnv(
        'GEMINI_MODEL_COOLDOWN_MAX_MS',
        120000,
        5000,
        600000
      );

    const requestStartedAt =
      Date.now();

    const overallDeadline =
      requestStartedAt +
      totalTimeoutMs;

    let lastError: any =
      undefined;

    let attemptedModels = 0;

    for (const modelName of modelsToTry) {
      const now =
        Date.now();

      if (
        now >=
        overallDeadline
      ) {
        break;
      }

      if (
        this.isModelCoolingDown(
          modelName,
          now
        )
      ) {
        const health =
          this.getModelHealth(
            modelName
          );

        const remaining =
          Math.max(
            0,
            health.cooldownUntil -
              now
          );

        console.info(
          `[Gemini] Skipping ${modelName}; model cooldown has ${remaining}ms remaining.`
        );

        continue;
      }

      attemptedModels +=
        1;

      for (
        let retryAttempt = 0;
        retryAttempt <=
        maxRetries;
        retryAttempt += 1
      ) {
        const currentTime =
          Date.now();

        if (
          currentTime >=
          overallDeadline
        ) {
          break;
        }

        const remainingTime =
          overallDeadline -
          currentTime;

        const attemptTimeout =
          Math.min(
            timeoutMs,
            remainingTime
          );

        if (
          attemptTimeout <=
          0
        ) {
          break;
        }

        const attemptNumber =
          retryAttempt + 1;

        try {
          console.info(
            `[Gemini] Attempting model: ${modelName} (attempt ${attemptNumber}/${maxRetries + 1})`
          );

          const response =
            await this.executeGeminiModelRequest(
              modelName,
              params,
              attemptTimeout
            );

          this.markModelSuccess(
            modelName
          );

          console.info(
            `[Gemini] Model ${modelName} succeeded on attempt ${attemptNumber}.`
          );

          return {
            response,
            model:
              modelName
          };
        } catch (error: any) {
          lastError =
            error;

          const transient =
            this.isTransientGeminiError(
              error
            );

          const status =
            this.getGeminiErrorStatus(
              error
            );

          const message =
            this.getGeminiErrorMessage(
              error
            );

          console.warn(
            `[Gemini Model Warning] ${modelName} attempt ${attemptNumber} failed${status ? ` with status ${status}` : ''}: ${message}`
          );

          /**
           * Non-transient errors should normally not be retried
           * against the same model because retries will not fix
           * invalid requests, authentication problems, malformed
           * configuration, etc.
           */
          if (
            !transient
          ) {
            console.warn(
              `[Gemini] ${modelName} returned a non-transient error. Moving to the next model.`
            );

            this.markModelFailure(
              modelName,
              modelCooldownMs,
              modelCooldownMaxMs
            );

            break;
          }

          /**
           * A transient failure means the model/provider may recover.
           * Retry the same model while retry budget remains.
           */
          if (
            retryAttempt <
            maxRetries
          ) {
            const delay =
              this.calculateRetryDelay(
                attemptNumber,
                retryBaseDelayMs,
                retryMaxDelayMs
              );

            const timeRemaining =
              Math.max(
                0,
                overallDeadline -
                  Date.now()
              );

            if (
              timeRemaining <=
              100
            ) {
              break;
            }

            const boundedDelay =
              Math.min(
                delay,
                Math.max(
                  0,
                  timeRemaining -
                    100
                )
              );

            console.info(
              `[Gemini] Retrying ${modelName} after ${boundedDelay}ms.`
            );

            await this.sleep(
              boundedDelay
            );

            continue;
          }

          /**
           * Retries for this model are exhausted.
           * Put the model on cooldown and rotate to another model.
           */
          this.markModelFailure(
            modelName,
            modelCooldownMs,
            modelCooldownMaxMs
          );

          console.warn(
            `[Gemini] Exhausted retries for ${modelName}; rotating to another model.`
          );

          break;
        }
      }
    }

    const elapsed =
      Date.now() -
      requestStartedAt;

    const lastMessage =
      this.getGeminiErrorMessage(
        lastError
      );

    const diagnosticMessage =
      [
        'All available Gemini generation attempts failed.',
        `Elapsed: ${elapsed}ms.`,
        `Models considered: ${modelsToTry.join(', ')}.`,
        `Models attempted: ${attemptedModels}.`,
        lastMessage
          ? `Last error: ${lastMessage}`
          : ''
      ]
        .filter(Boolean)
        .join(' ');

    console.error(
      `[Gemini] ${diagnosticMessage}`
    );

    throw new Error(
      diagnosticMessage
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
            item.sender ===
              'ai' ||
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

    const cleaned =
      normalized
        .filter(
          (item) =>
            typeof item.text ===
              'string' &&
            item.text.trim()
        )
        .slice(-30);

    if (
      cleaned.length === 0
    ) {
      return 'No previous conversation is available.';
    }

    return cleaned
      .map(
        (item) =>
          `${item.role}: ${item.text.trim()}`
      )
      .join('\n');
  }

  /**
   * Extract an item ID safely.
   */
  private static resolveItemId(
    itemId?: string
  ): string | undefined {
    if (
      typeof itemId !==
      'string'
    ) {
      return undefined;
    }

    const value =
      itemId.trim();

    if (
      !value ||
      value ===
        'general-ai-session'
    ) {
      return undefined;
    }

    return value;
  }

  /**
   * Main AI message processor.
   */
  public static async processMessage(
    input: ProcessChatMessageInput
  ): Promise<any> {
    const {
      itemId,
      buyerSession,
      buyerId,
      message,
      offeredPrice,
      quantity = 1,
      systemPrompt,
      sessionId,
      history = [],
      userConfirmationConfirmed,
      pendingTool,
      agentTools = [],
      toolResults = []
    } = input;

    const cleanMessage =
      typeof message ===
      'string'
        ? message.trim()
        : '';

    if (!cleanMessage) {
      throw new Error(
        'A valid message is required.'
      );
    }

    if (
      !buyerSession ||
      typeof buyerSession !==
        'string'
    ) {
      throw new Error(
        'buyerSession is required.'
      );
    }

    const resolvedBuyerSession =
      buyerSession.trim();

    const resolvedBuyerId =
      buyerId &&
      buyerId !==
        'guest_user'
        ? String(
            buyerId
          ).trim()
        : undefined;

    const resolvedItemId =
      this.resolveItemId(
        itemId
      );

    let activeItem: any =
      null;

    let aiConfig: any =
      null;

    let session: any =
      null;

    let systemInstruction =
      '';

    // ==========================================
    // Resolve product context safely
    // ==========================================

    if (resolvedItemId) {
      try {
        activeItem =
          await (
            prisma as any
          ).item.findUnique({
            where: {
              id: resolvedItemId
            },
            include: {
              aiConfig: true,
              seller: true
            }
          });

        if (
          activeItem
        ) {
          aiConfig =
            activeItem.aiConfig ||
            null;
        } else {
          console.warn(
            `[AI Controller] Item ${resolvedItemId} was not found. Continuing as general AI.`
          );
        }
      } catch (error) {
        console.warn(
          '[AI Controller] Product lookup failed; continuing as general AI:',
          error
        );
      }
    }

    // ==========================================
    // Product-specific system prompt
    // ==========================================

    if (
      activeItem
    ) {
      const city =
        activeItem.locationCity ||
        activeItem.city ||
        activeItem.seller?.city ||
        'Not specified';

      const area =
        activeItem.locationArea ||
        activeItem.area ||
        activeItem.seller?.area ||
        'Not specified';

      const address =
        activeItem.locationAddress ||
        activeItem.pickupAddress ||
        activeItem.seller?.address ||
        'Available through Tradara chat';

      const currency =
        activeItem.currency ||
        '₦';

      const listedPrice =
        Number(
          activeItem.price ||
            0
        );

      const minimumPrice =
        Number(
          aiConfig?.minimumPrice ??
            activeItem.price ??
            0
        );

      const targetPrice =
        Number(
          aiConfig?.targetPrice ??
            activeItem.price ??
            0
        );

      systemInstruction = `
You are TRADARA AI, the intelligent assistant for the TRADARA marketplace.

You are currently assisting a customer with:

PRODUCT:
Name: ${
        activeItem.stockName ||
        activeItem.title ||
        'this product'
      }
Item ID: ${
        activeItem.id ||
        resolvedItemId
      }
Listed price: ${currency}${listedPrice.toLocaleString()}
Category: ${
        activeItem.category ||
        'Not specified'
      }

PRODUCT INFORMATION:
Description: ${
        activeItem.description ||
        'Not specified'
      }
Specifications: ${
        aiConfig?.specifications ||
        'Not specified'
      }
Condition: ${
        aiConfig?.condition ||
        'Not specified'
      }
Warranty: ${
        aiConfig?.warrantyPeriod ||
        'Not specified'
      }
FAQ / Knowledge Base: ${
        aiConfig?.faqKnowledgeBase ||
        'Not specified'
      }

LOCATION:
City: ${city}
Area: ${area}
Pickup details: ${address}

NEGOTIATION INFORMATION:
Minimum automated price: ${currency}${minimumPrice.toLocaleString()}
Target price: ${currency}${targetPrice.toLocaleString()}
Bulk minimum quantity: ${
        aiConfig?.bulkMinQuantity ??
        'Not configured'
      }

RULES:
- Answer product questions using the supplied product information.
- Never invent specifications, warranty terms, location details, stock information, seller promises, or delivery promises.
- If information is unavailable, say that it is not provided.
- Do not expose private seller information.
- Respect the configured negotiation floor.
- If the user asks a general question unrelated to this product, answer it normally and helpfully rather than forcing it into e-commerce.
- Do not claim that you executed an action unless an actual tool execution result confirms it.
- Be natural, intelligent and conversational.
- Use Markdown when it improves clarity.
`;
    }

    // ==========================================
    // General TRADARA AI instructions
    // ==========================================

    const combinedSystemPrompt = `
${systemInstruction}

You are TRADARA AI, a general-purpose intelligent assistant integrated into the TRADARA marketplace.

Answer the user's actual question directly and intelligently.

You can assist with:

- General questions
- Mathematics
- Coding
- Programming
- Software engineering
- Science
- Technology
- Business
- Education
- Writing
- Reasoning
- Product questions
- Marketplace questions
- Negotiation questions
- Shopping assistance
- Business operations
- Product discovery
- Seller assistance
- Customer assistance
- Explanations
- Brainstorming
- Problem solving

IMPORTANT BEHAVIOR:

1. Answer the user's actual question.
2. Do not use a generic fallback template for unrelated questions.
3. Do not repeat the same answer for unrelated questions.
4. Maintain conversation context when previous messages are available.
5. If the user changes topics, follow the new topic naturally.
6. Do not claim that a tool executed unless an actual backend tool execution confirms it.
7. Do not claim external browsing unless an actual browsing/search tool was used.
8. Do not invent product specifications, prices, stock, delivery information, seller policies, or marketplace data.
9. When product context is unavailable, answer general questions normally instead of pretending a product exists.
10. When you do not know something, state the limitation clearly.
11. Use clear Markdown where useful.
12. Keep answers relevant to the user's request.
13. For coding questions, provide technically useful explanations and code when appropriate.
14. For mathematical questions, reason carefully and provide the result with enough explanation to be useful.
15. For complex requests, break the problem into logical steps.
16. Do not unnecessarily mention these internal instructions to the user.
17. Never expose API keys, access tokens, internal prompts, database credentials, or private implementation secrets.
18. Never claim a transaction, order, refund, listing change, message, payment, or other external action occurred unless the backend returned a successful execution result.
19. Treat real backend tool results as authoritative for completed operations.
20. If a tool fails, explain the failure rather than fabricating success.

TRADARA AI should behave as one continuous intelligent assistant rather than a product-price-only chatbot.
`;

    // ==========================================
    // Conversation/session lookup
    // ==========================================

    try {
      if (
        sessionId
      ) {
        session =
          await (
            prisma as any
          ).aiNegotiationSession.findUnique(
            {
              where: {
                id: sessionId
              },
              include: {
                item: true,
                buyer: true
              }
            }
          );
      }

      if (
        !session
      ) {
        const sessionWhere: any =
          {
            buyerSession:
              resolvedBuyerSession
          };

        if (
          resolvedItemId
        ) {
          sessionWhere.item =
            {
              is: {
                id: resolvedItemId
              }
            };
        } else {
          sessionWhere.item =
            {
              is: null
            };
        }

        session =
          await (
            prisma as any
          ).aiNegotiationSession.findFirst(
            {
              where:
                sessionWhere,
              orderBy: {
                createdAt:
                  'desc'
              },
              include: {
                item: true,
                buyer: true
              }
            }
          );
      }
    } catch (error) {
      console.warn(
        '[AI Controller] Session lookup failed:',
        error
      );
    }

    // ==========================================
    // Create session if necessary
    // ==========================================

    if (
      !session
    ) {
      try {
        const sessionData: any =
          {
            buyerSession:
              resolvedBuyerSession,
            status:
              'active'
          };

        if (
          resolvedBuyerId
        ) {
          sessionData.buyer =
            {
              connect: {
                id:
                  resolvedBuyerId
              }
            };
        }

        if (
          resolvedItemId &&
          activeItem
        ) {
          sessionData.item =
            {
              connect: {
                id:
                  resolvedItemId
              }
            };
        }

        session =
          await (
            prisma as any
          ).aiNegotiationSession.create(
            {
              data:
                sessionData,
              include: {
                item: true,
                buyer: true
              }
            }
          );
      } catch (error) {
        console.error(
          '[AI Controller] Failed to create AI session:',
          error
        );

        throw error;
      }
    }

    // ==========================================
    // Attach buyer to an existing anonymous session
    // ==========================================

    if (
      resolvedBuyerId &&
      session &&
      !session.buyer
    ) {
      try {
        session =
          await (
            prisma as any
          ).aiNegotiationSession.update(
            {
              where: {
                id:
                  session.id
              },
              data: {
                buyer: {
                  connect: {
                    id:
                      resolvedBuyerId
                  }
                }
              },
              include: {
                item: true,
                buyer: true
              }
            }
          );
      } catch (error) {
        console.warn(
          '[AI Controller] Could not attach buyer to existing session:',
          error
        );
      }
    }

    // ==========================================
    // Load conversation messages
    // ==========================================

    let databaseMessages: any[] =
      [];

    try {
      databaseMessages =
        await (
          prisma as any
        ).aiChatMessage.findMany({
          where: {
            sessionId:
              session.id
          },
          orderBy: {
            createdAt:
              'asc'
          },
          take: 50
        });
    } catch (error) {
      console.warn(
        '[AI Controller] Could not load AI chat history:',
        error
      );
    }

    const conversationContext =
      this.buildConversationContext(
        databaseMessages,
        history
      );

    // ==========================================
    // Buyer perception
    // ==========================================

    const perception =
      this.perceiveBuyerIntent(
        cleanMessage
      );

    // ==========================================
    // Marketplace intelligence
    // ==========================================

    const marketplaceIntelligence =
      await this.gatherMarketplaceIntelligence(
        resolvedItemId,
        resolvedBuyerId
      );

    // ==========================================
    // Negotiation engine context
    // ==========================================

    let deterministicNegotiation:
      any = null;

    if (
      activeItem &&
      (
        perception.detectedIntent ===
          'bargain' ||
        typeof offeredPrice ===
          'number'
      )
    ) {
      try {
        const negotiationInput: any =
          {
            item:
              activeItem,
            message:
              cleanMessage,
            offeredPrice:
              typeof offeredPrice ===
              'number'
                ? offeredPrice
                : undefined,
            quantity:
              Math.max(
                1,
                Number(
                  quantity || 1
                )
              ),
            buyerPerception:
              perception,
            marketplaceIntelligence
          };

        if (
          typeof (
            NegotiationEngine as any
          ).evaluate ===
          'function'
        ) {
          deterministicNegotiation =
            await (
              NegotiationEngine as any
            ).evaluate(
              negotiationInput
            );
        } else if (
          typeof (
            NegotiationEngine as any
          ).processNegotiation ===
          'function'
        ) {
          deterministicNegotiation =
            await (
              NegotiationEngine as any
            ).processNegotiation(
              negotiationInput
            );
        }
      } catch (error) {
        console.warn(
          '[AI Controller] Deterministic negotiation engine was unavailable for this message:',
          error
        );
      }
    }

    // ==========================================
    // Build model context
    // ==========================================

    const intelligenceContext = `
BUYER PERCEPTION:
${JSON.stringify(
  perception,
  null,
  2
)}

MARKETPLACE INTELLIGENCE:
${JSON.stringify(
  marketplaceIntelligence,
  null,
  2
)}

DETERMINISTIC NEGOTIATION RESULT:
${JSON.stringify(
  deterministicNegotiation ||
    null,
  null,
  2
)}

CONVERSATION HISTORY:
${conversationContext}
`;

    const toolResultContext =
      this.buildToolResultContext(
        toolResults
      );

    const userPrompt = `
USER MESSAGE:
${cleanMessage}

${intelligenceContext}

${toolResultContext}

${systemPrompt || ''}

Respond to the user's current message.
`;

    // ==========================================
    // Gemini tool declarations
    // ==========================================

    const declarations =
      this.buildGeminiToolDeclarations(
        agentTools
      );

    const generationConfig: any =
      {
        systemInstruction:
          combinedSystemPrompt,
        temperature:
          0.4
      };

    if (
      declarations.length > 0
    ) {
      generationConfig.tools =
        [
          {
            functionDeclarations:
              declarations
          }
        ];
    }

    // ==========================================
    // Generate AI response
    // ==========================================

    let modelGeneration:
      GeminiGenerationResult;

    try {
      modelGeneration =
        await this.generateWithModelFallback(
          {
            contents:
              userPrompt,
            config:
              generationConfig
          }
        );
    } catch (error: any) {
      console.error(
        '[AI Controller] Gemini AI Processing Error:',
        error
      );

      throw new Error(
        'The AI model could not generate a response.'
      );
    }

    const modelResponse =
      modelGeneration.response;

    const successfulModel =
      modelGeneration.model;

    const parsed =
      this.parseGeminiResponse(
        modelResponse
      );

    let aiResponse =
      this.sanitizeResponse(
        parsed.text
      );

    const toolCalls =
      parsed.toolCalls;

    // ==========================================
    // Tool-call approval metadata
    // ==========================================

    let requiresConfirmation =
      false;

    let pendingToolDetails:
      any = undefined;

    if (
      toolCalls.length > 0
    ) {
      for (const call of toolCalls) {
        const definition =
          agentTools.find(
            (tool) =>
              tool.name ===
              call.name
          );

        if (
          definition?.requiresApproval ||
          definition?.riskLevel ===
            'EXECUTE'
        ) {
          requiresConfirmation =
            true;

          pendingToolDetails =
            {
              toolName:
                call.name,
              params:
                call.arguments,
              reason:
                `The "${call.name}" operation requires explicit user approval before execution.`,
              riskLevel:
                definition.riskLevel ||
                'EXECUTE'
            };

          break;
        }
      }
    }

    // ==========================================
    // Existing pending tool approval flow
    // ==========================================

    if (
      pendingTool &&
      userConfirmationConfirmed ===
        true
    ) {
      requiresConfirmation =
        false;
    }

    // ==========================================
    // Fallback response protection
    // ==========================================

    if (
      !aiResponse &&
      toolCalls.length === 0
    ) {
      if (
        deterministicNegotiation
      ) {
        aiResponse =
          String(
            deterministicNegotiation.message ||
              deterministicNegotiation.response ||
              deterministicNegotiation.reply ||
              ''
          ).trim();
      }
    }

    if (
      !aiResponse &&
      toolCalls.length > 0
    ) {
      aiResponse =
        'I have identified the required operation. The Tradara agent will process it through the authorized tool workflow.';
    }

    if (
      !aiResponse
    ) {
      aiResponse =
        'I’m ready to help. Tell me what you would like to do.';
    }

    // ==========================================
    // Persist user message
    // ==========================================

    try {
      await (
        prisma as any
      ).aiChatMessage.create({
        data: {
          sessionId:
            session.id,
          sender:
            'user',
          message:
            cleanMessage
        }
      });
    } catch (error) {
      console.warn(
        '[AI Controller] Could not persist user AI message:',
        error
      );
    }

    // ==========================================
    // Persist assistant message
    // ==========================================

    try {
      await (
        prisma as any
      ).aiChatMessage.create({
        data: {
          sessionId:
            session.id,
          sender:
            'ai',
          message:
            aiResponse
        }
      });
    } catch (error) {
      console.warn(
        '[AI Controller] Could not persist AI response:',
        error
      );
    }

    // ==========================================
    // Learning
    // ==========================================

    try {
      await this.recordInteractionLearning(
        session.id,
        cleanMessage,
        aiResponse,
        perception,
        deterministicNegotiation
          ?.status ||
          session.status ||
          'active'
      );
    } catch (error) {
      console.warn(
        '[AI Controller] Learning persistence failed:',
        error
      );
    }

    // ==========================================
    // Build result
    // ==========================================

    return {
      success: true,

      sessionId:
        session.id,

      buyerSession:
        resolvedBuyerSession,

      itemId:
        resolvedItemId,

      reply:
        aiResponse,

      response:
        aiResponse,

      message:
        aiResponse,

      content:
        aiResponse,

      toolCalls,

      requiresConfirmation,

      pendingToolDetails,

      perception,

      marketplaceIntelligence,

      negotiation:
        deterministicNegotiation,

      metadata: {
        model:
          successfulModel ||
          this.lastSuccessfulGeminiModel ||
          process.env.GEMINI_MODEL ||
          'gemini-3.8-flash',

        configuredModel:
          process.env.GEMINI_MODEL ||
          'gemini-3.8-flash',

        toolCount:
          toolCalls.length,

        usedTools:
          toolCalls.length >
          0,

        sessionId:
          session.id
      }
    };
  }

  /**
   * Update a negotiation session status.
   */
  public static async updateSessionStatus(
    sessionId: string,
    status: string
  ): Promise<any> {
    const allowedStatuses = [
      'active',
      'agreed',
      'transferred',
      'closed',
      'human_agent'
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw new Error(
        `Invalid session status "${status}".`
      );
    }

    return (
      prisma as any
    ).aiNegotiationSession.update({
      where: {
        id: sessionId
      },
      data: {
        status
      }
    });
  }
}

export default AiSalesService;