// ==========================================
// FILE: backend/src/ai/orchestrator/tradaraOrchestrator.ts
// ==========================================

import { modelRouter, TaskComplexity } from '../router/modelRouter';
import { toolRegistry } from '../tools/ToolRegistry';
import { SecurityContext, ToolExecutionResult } from '../tools/types';
import { AiChatMessagePayload } from '../providers/aiProvider.interface';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrchestratorExecutionParams {
  messages: AiChatMessagePayload[];
  context: SecurityContext;
  preferredProvider?: string;
  complexity?: TaskComplexity;
  userConfirmationConfirmed?: boolean;
  systemInstruction?: string;
}

export interface OrchestratorResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  executedTools: string[];
  requiresConfirmation: boolean;
  securityFlag: boolean;
  latencyMs: number;
  pendingToolDetails?: {
    toolName: string;
    params: any;
  };
}

export class TradaraOrchestrator {
  private static instance: TradaraOrchestrator;

  private constructor() {}

  public static getInstance(): TradaraOrchestrator {
    if (!TradaraOrchestrator.instance) {
      TradaraOrchestrator.instance = new TradaraOrchestrator();
    }
    return TradaraOrchestrator.instance;
  }

  public async execute(params: OrchestratorExecutionParams): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const provider = modelRouter.resolveProvider({
      preferredProvider: params.preferredProvider,
      complexity: params.complexity,
      requiresTools: true
    });

    const availableTools = toolRegistry.getToolsForRole(params.context.role);

    const executedTools: string[] = [];
    let requiresConfirmation = false;
    let securityFlag = false;
    let pendingToolDetails: { toolName: string; params: any } | undefined;

    try {
      let aiResponse = await provider.generateCompletion(params.messages, {
        tools: availableTools,
        systemInstruction: params.systemInstruction
      });

      let currentMessages = [...params.messages];

      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        for (const toolCall of aiResponse.toolCalls) {
          executedTools.push(toolCall.name);

          const toolResult: ToolExecutionResult = await toolRegistry.executeTool(
            toolCall.name,
            toolCall.args,
            params.context,
            params.userConfirmationConfirmed
          );

          if (toolResult.requiresApproval) {
            requiresConfirmation = true;
            pendingToolDetails = {
              toolName: toolCall.name,
              params: toolCall.args
            };

            const latencyMs = Date.now() - startTime;
            await this.logAudit({
              requestId,
              userId: params.context.userId,
              provider: provider.name,
              model: process.env.GEMINI_DEFAULT_MODEL || 'default',
              promptTokens: aiResponse.promptTokens || 0,
              completionTokens: aiResponse.completionTokens || 0,
              toolsExecuted: executedTools,
              requiresConfirmation: true,
              confirmationGranted: false,
              securityFlag: false,
              latencyMs
            });

            return {
              content: toolResult.error || `Action '${toolCall.name}' requires confirmation before execution.`,
              provider: provider.name,
              model: process.env.GEMINI_DEFAULT_MODEL || 'default',
              promptTokens: aiResponse.promptTokens || 0,
              completionTokens: aiResponse.completionTokens || 0,
              executedTools,
              requiresConfirmation: true,
              securityFlag: false,
              latencyMs,
              pendingToolDetails
            };
          }

          if (!toolResult.success) {
            securityFlag = toolResult.error?.includes('Access Denied') || false;
          }

          currentMessages.push({
            role: 'assistant',
            content: aiResponse.content || `[Tool Call: ${toolCall.name}]`
          });

          currentMessages.push({
            role: 'user',
            content: `[Tool Result for ${toolCall.name}]: ${JSON.stringify(toolResult)}`
          });

          const secondPassResponse = await provider.generateCompletion(currentMessages, {
            systemInstruction: params.systemInstruction
          });

          aiResponse = {
            content: secondPassResponse.content,
            promptTokens: (aiResponse.promptTokens || 0) + (secondPassResponse.promptTokens || 0),
            completionTokens: (aiResponse.completionTokens || 0) + (secondPassResponse.completionTokens || 0),
            rawResponse: secondPassResponse.rawResponse
          };
        }
      }

      const latencyMs = Date.now() - startTime;

      await this.logAudit({
        requestId,
        userId: params.context.userId,
        provider: provider.name,
        model: process.env.GEMINI_DEFAULT_MODEL || 'default',
        promptTokens: aiResponse.promptTokens || 0,
        completionTokens: aiResponse.completionTokens || 0,
        toolsExecuted: executedTools,
        requiresConfirmation,
        confirmationGranted: params.userConfirmationConfirmed ?? null,
        securityFlag,
        latencyMs
      });

      return {
        content: aiResponse.content || 'No response content generated.',
        provider: provider.name,
        model: process.env.GEMINI_DEFAULT_MODEL || 'default',
        promptTokens: aiResponse.promptTokens || 0,
        completionTokens: aiResponse.completionTokens || 0,
        executedTools,
        requiresConfirmation,
        securityFlag,
        latencyMs
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      await this.logAudit({
        requestId,
        userId: params.context.userId,
        provider: provider.name,
        model: 'error-fallback',
        promptTokens: 0,
        completionTokens: 0,
        toolsExecuted: executedTools,
        requiresConfirmation: false,
        confirmationGranted: null,
        securityFlag: true,
        latencyMs
      });

      throw error;
    }
  }

  private async logAudit(logData: {
    requestId: string;
    userId?: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    toolsExecuted: string[];
    requiresConfirmation: boolean;
    confirmationGranted: boolean | null;
    securityFlag: boolean;
    latencyMs: number;
  }): Promise<void> {
    try {
      await (prisma as any).aiAuditLog.create({
        data: {
          requestId: logData.requestId,
          userId: logData.userId || null,
          provider: logData.provider,
          model: logData.model,
          promptTokens: logData.promptTokens,
          completionTokens: logData.completionTokens,
          toolsExecuted: logData.toolsExecuted,
          requiresConfirmation: logData.requiresConfirmation,
          confirmationGranted: logData.confirmationGranted,
          securityFlag: logData.securityFlag,
          latencyMs: logData.latencyMs
        }
      });
    } catch (error) {
      console.error('[TradaraOrchestrator] Failed to log AI audit entry:', error);
    }
  }
}

export const tradaraOrchestrator = TradaraOrchestrator.getInstance();