// ==========================================
// FILE: backend/src/ai/controllers/chatController.ts
// ==========================================

import { Response } from 'express';
import {
  AuthenticatedRequest,
  SecurityContext
} from '../tools/types';
import {
  AgentOrchestrator
} from '../orchestrator/AgentOrchestrator';
import {
  ToolRegistry
} from '../tools/ToolRegistry';
import {
  MemoryService
} from '../memory/MemoryService';
import {
  productTools
} from '../tools/productTools';

const toolRegistry =
  ToolRegistry.getInstance();

productTools.forEach((tool) =>
  toolRegistry.registerTool(tool)
);

const apiKey =
  process.env.GEMINI_API_KEY || '';

const memoryService =
  new MemoryService(apiKey);

const AgentOrchestratorCtor =
  AgentOrchestrator as unknown as new (
    ...args: any[]
  ) => any;

const agentOrchestrator =
  AgentOrchestrator.length === 0
    ? new AgentOrchestratorCtor()
    : new AgentOrchestratorCtor(
        apiKey,
        toolRegistry,
        memoryService
      );

/**
 * Handles incoming chat interactions through
 * the Agent Orchestrator.
 */
export const handleOrchestratedChat =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const {
        message,
        conversationHistory = [],
        history = []
      } = req.body || {};

      if (
        !message ||
        typeof message !== 'string' ||
        !message.trim()
      ) {
        res.status(400).json({
          success: false,
          error:
            'A valid text message is required.'
        });

        return;
      }

      const cleanMessage =
        message.trim();

      const resolvedHistory =
        Array.isArray(history) &&
        history.length
          ? history
          : conversationHistory;

      const securityContext:
        SecurityContext = {
        userId:
          req.user?.id,
        role:
          req.user?.role ||
          'GUEST',
        storeId:
          req.user?.storeId,
        permissions:
          req.user?.permissions ||
          ['READ_ONLY'],
        ipAddress:
          req.ip
      };

      let orchestrationResult:
        any;

      // ==========================================
      // Modern Iterative Agent
      // ==========================================

      if (
        typeof agentOrchestrator.processUserQuery ===
        'function'
      ) {
        const result =
          await agentOrchestrator.processUserQuery(
            cleanMessage,
            resolvedHistory,
            securityContext
          );

        orchestrationResult = {
          message:
            result.response ||
            result.message ||
            '',
          response:
            result.response ||
            result.message ||
            '',
          toolExecutions:
            result.toolExecutions ||
            [],
          iterationsUsed:
            result.iterations ||
            result.iterationsUsed ||
            1,
          requiresConfirmation:
            result.requiresConfirmation ||
            false,
          pendingToolDetails:
            result.pendingToolDetails
        };
      }

      // ==========================================
      // Existing Commerce Agent
      // ==========================================

      else if (
        typeof agentOrchestrator.processRequest ===
        'function'
      ) {
        const result =
          await agentOrchestrator.processRequest({
            message:
              cleanMessage,
            history:
              resolvedHistory,
            userName:
              req.user?.name
          });

        orchestrationResult = {
          message:
            result.responseText ||
            result.response ||
            '',
          response:
            result.responseText ||
            result.response ||
            '',
          toolExecutions:
            result.toolExecutions ||
            [],
          iterationsUsed:
            result.iterations ||
            1,
          quickOffers:
            result.quickOffers,
          toolExecuted:
            result.toolExecuted,
          requiresConfirmation:
            result.requiresConfirmation ||
            false,
          pendingToolDetails:
            result.pendingToolDetails
        };
      }

      // ==========================================
      // Direct Gemini Fallback
      //
      // This is a genuine model fallback, not a
      // fake hard-coded answer.
      // ==========================================

      else {
        if (!apiKey) {
          throw new Error(
            'GEMINI_API_KEY is not configured and the AgentOrchestrator does not expose a supported handler.'
          );
        }

        const {
          GoogleGenAI
        } = await import(
          '@google/genai'
        );

        const ai =
          new GoogleGenAI({
            apiKey
          });

        const formattedHistory =
          (resolvedHistory || [])
            .filter((item: any) => {
              const text =
                item.parts?.[0]?.text ||
                item.content ||
                item.message ||
                '';

              return (
                typeof text ===
                  'string' &&
                text.trim()
                  .length > 0
              );
            })
            .slice(-20)
            .map((item: any) => ({
              role:
                item.role ===
                'assistant'
                  ? 'model'
                  : item.role ===
                    'model'
                  ? 'model'
                  : 'user',
              parts:
                item.parts ||
                [
                  {
                    text:
                      item.content ||
                      item.message ||
                      ''
                  }
                ]
            }));

        const chat =
          ai.chats.create({
            model:
              process.env.GEMINI_MODEL ||
              'gemini-2.5-flash',
            config: {
              systemInstruction: `
You are TRADARA AI, a highly capable general-purpose assistant.

Answer the user's actual question directly.
Do not force unrelated questions into e-commerce.
Maintain conversation context.
Do not claim actions or tool executions that did not happen.
Use clear and natural Markdown.
`,
              temperature: 0.5,
              maxOutputTokens: 2048
            },
            history:
              formattedHistory as any
          });

        const chatResult =
          await chat.sendMessage({
            message:
              cleanMessage
          });

        orchestrationResult = {
          message:
            chatResult.text ||
            '',
          response:
            chatResult.text ||
            '',
          toolExecutions: [],
          iterationsUsed: 1
        };
      }

      res.status(200).json({
        success: true,
        data:
          orchestrationResult
      });
    } catch (error: any) {
      console.error(
        'TRADARA AI Orchestration Error:',
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          'An internal error occurred while processing the request.'
      });
    }
  };