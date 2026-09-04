// ==========================================
// FILE: backend/src/ai/controllers/streamController.ts
// ==========================================

import { Response } from 'express';
import { AuthenticatedRequest, SecurityContext } from '../tools/types';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { ToolRegistry } from '../tools/ToolRegistry';
import { MemoryService } from '../memory/MemoryService';
import { SSEStreamWriter } from '../utils/sseStream';

const toolRegistry = ToolRegistry.getInstance();
const apiKey = process.env.GEMINI_API_KEY || '';
const memoryService = new MemoryService(apiKey);

const AgentOrchestratorCtor = AgentOrchestrator as unknown as new (...args: any[]) => any;
const agentOrchestrator = AgentOrchestrator.length === 0
  ? new AgentOrchestratorCtor()
  : new AgentOrchestratorCtor(apiKey, toolRegistry, memoryService);

/**
 * Handles incoming SSE streaming chat interactions.
 */
export const handleStreamChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stream = new SSEStreamWriter(res);

  // Setup heartbeat ping to keep HTTP connection alive
  const pingInterval = setInterval(() => stream.ping(), 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
  });

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      clearInterval(pingInterval);
      stream.error('A valid text message is required.', 400);
      return;
    }

    const securityContext: SecurityContext = {
      userId: req.user?.id,
      role: req.user?.role || 'GUEST',
      storeId: req.user?.storeId,
      permissions: req.user?.permissions || ['READ_ONLY'],
      ipAddress: req.ip,
    };

    stream.send('chunk', { type: 'status', content: 'Processing query with Agent Orchestrator...' });

    // Handle processUserQuery execution
    if (typeof agentOrchestrator.processUserQuery === 'function') {
      const result = await agentOrchestrator.processUserQuery(
        message,
        conversationHistory,
        securityContext
      );

      // Emit tool execution logs if any occurred
      if (result.toolExecutions && result.toolExecutions.length > 0) {
        for (const toolExec of result.toolExecutions) {
          stream.send('tool_start', { toolName: toolExec.toolName, params: toolExec.params });
          stream.send('tool_end', { toolName: toolExec.toolName, result: toolExec.result });
        }
      }

      // Stream text response chunks
      const responseText = result.response || '';
      const chunkSize = 20;

      for (let i = 0; i < responseText.length; i += chunkSize) {
        const textChunk = responseText.slice(i, i + chunkSize);
        stream.send('chunk', { type: 'text', content: textChunk });
      }

      clearInterval(pingInterval);
      stream.close({
        iterationsUsed: result.iterations,
        totalToolsExecuted: result.toolExecutions?.length || 0,
      });
    } else {
      clearInterval(pingInterval);
      stream.error('AgentOrchestrator stream integration non-supported.');
    }
  } catch (error: any) {
    clearInterval(pingInterval);
    console.error('TRADARA AI Stream Error:', error);
    stream.error(error.message || 'An internal streaming error occurred.');
  }
};