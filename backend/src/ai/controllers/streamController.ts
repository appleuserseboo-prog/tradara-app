// ==========================================
// FILE: backend/src/ai/controllers/streamController.ts
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
  SSEStreamWriter
} from '../utils/sseStream';

const toolRegistry =
  ToolRegistry.getInstance();

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
 * Handles incoming SSE streaming chat interactions.
 */
export const handleStreamChat =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const stream =
      new SSEStreamWriter(res);

    const pingInterval =
      setInterval(
        () => stream.ping(),
        15000
      );

    req.on('close', () => {
      clearInterval(
        pingInterval
      );
    });

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
        clearInterval(
          pingInterval
        );

        stream.error(
          'A valid text message is required.',
          400
        );

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

      stream.send(
        'chunk',
        {
          type: 'status',
          content:
            'Processing your request...'
        }
      );

      // ==========================================
      // Agentic Streaming Path
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

        if (
          result.toolExecutions &&
          result.toolExecutions.length >
            0
        ) {
          for (const toolExec of result.toolExecutions) {
            stream.send(
              'tool_start',
              {
                toolName:
                  toolExec.toolName ||
                  toolExec.name,
                params:
                  toolExec.params ||
                  {}
              }
            );

            stream.send(
              'tool_end',
              {
                toolName:
                  toolExec.toolName ||
                  toolExec.name,
                result:
                  toolExec.result
              }
            );
          }
        }

        const responseText =
          result.response ||
          result.message ||
          '';

        const chunkSize =
          24;

        for (
          let i = 0;
          i < responseText.length;
          i += chunkSize
        ) {
          stream.send(
            'chunk',
            {
              type: 'text',
              content:
                responseText.slice(
                  i,
                  i + chunkSize
                )
            }
          );
        }

        clearInterval(
          pingInterval
        );

        stream.close({
          iterationsUsed:
            result.iterations ||
            result.iterationsUsed ||
            1,
          totalToolsExecuted:
            result.toolExecutions
              ?.length || 0
        });

        return;
      }

      // ==========================================
      // Commerce Orchestrator Compatibility Path
      // ==========================================

      if (
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

        if (
          result.toolExecutions &&
          result.toolExecutions.length >
            0
        ) {
          for (const toolExec of result.toolExecutions) {
            stream.send(
              'tool_start',
              {
                toolName:
                  toolExec.toolName ||
                  toolExec.name,
                params:
                  toolExec.params ||
                  {}
              }
            );

            stream.send(
              'tool_end',
              {
                toolName:
                  toolExec.toolName ||
                  toolExec.name,
                result:
                  toolExec.result
              }
            );
          }
        }

        const responseText =
          result.responseText ||
          result.response ||
          '';

        const chunkSize =
          24;

        for (
          let i = 0;
          i < responseText.length;
          i += chunkSize
        ) {
          stream.send(
            'chunk',
            {
              type: 'text',
              content:
                responseText.slice(
                  i,
                  i + chunkSize
                )
            }
          );
        }

        clearInterval(
          pingInterval
        );

        stream.close({
          iterationsUsed:
            result.iterations ||
            1,
          totalToolsExecuted:
            result.toolExecutions
              ?.length || 0,
          toolExecuted:
            result.toolExecuted ||
            false
        });

        return;
      }

      // ==========================================
      // No Orchestrator Integration
      // ==========================================

      clearInterval(
        pingInterval
      );

      stream.error(
        'No compatible AgentOrchestrator handler is available.',
        503
      );
    } catch (error: any) {
      clearInterval(
        pingInterval
      );

      console.error(
        'TRADARA AI Stream Error:',
        error
      );

      stream.error(
        error.message ||
          'An internal streaming error occurred.'
      );
    }
  };