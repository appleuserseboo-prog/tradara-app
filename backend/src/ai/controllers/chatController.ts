// ==========================================
// FILE: backend/src/ai/controllers/chatController.ts
// ==========================================

import { Response } from 'express';
import { AuthenticatedRequest, SecurityContext } from '../tools/types';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { ToolRegistry } from '../tools/ToolRegistry';
import { MemoryService } from '../memory/MemoryService';
import { productTools } from '../tools/productTools';

// Access Singleton instance of ToolRegistry and register tools
const toolRegistry = ToolRegistry.getInstance();
productTools.forEach(tool => toolRegistry.registerTool(tool));

const apiKey = process.env.GEMINI_API_KEY || '';
const memoryService = new MemoryService(apiKey);

// Flexibly instantiate AgentOrchestrator whether it expects 0 or 3 constructor arguments
const AgentOrchestratorCtor = AgentOrchestrator as unknown as new (...args: any[]) => any;
const agentOrchestrator = AgentOrchestrator.length === 0
  ? new AgentOrchestratorCtor()
  : new AgentOrchestratorCtor(apiKey, toolRegistry, memoryService);

/**
 * Handles incoming chat interactions through the Agent Orchestrator.
 */
export const handleOrchestratedChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'A valid text message is required.' });
      return;
    }

    // Map req.user to security context
    const securityContext: SecurityContext = {
      userId: req.user?.id,
      role: req.user?.role || 'GUEST',
      storeId: req.user?.storeId,
      permissions: req.user?.permissions || ['READ_ONLY'],
      ipAddress: req.ip,
    };

    // Support both processUserQuery (Iterative Agent) and processRequest (Commerce/Negotiation) methods
    let orchestrationResult: any;

    if (typeof agentOrchestrator.processUserQuery === 'function') {
      const result = await agentOrchestrator.processUserQuery(
        message,
        conversationHistory,
        securityContext
      );
      orchestrationResult = {
        message: result.response,
        toolExecutions: result.toolExecutions,
        iterationsUsed: result.iterations,
      };
    } else if (typeof agentOrchestrator.processRequest === 'function') {
      const result = await agentOrchestrator.processRequest({
        message,
        history: conversationHistory,
        userName: req.user?.id,
      });
      orchestrationResult = {
        message: result.responseText,
        toolExecutions: result.toolExecuted ? [{ toolName: result.toolExecuted, params: {}, result: result.negotiationOutput }] : [],
        iterationsUsed: 1,
        quickOffers: result.quickOffers,
      };
    } else {
      throw new Error('AgentOrchestrator does not implement a recognized handler method.');
    }

    res.status(200).json({
      success: true,
      data: orchestrationResult,
    });
  } catch (error: any) {
    console.error('TRADARA AI Orchestration Error:', error);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing the request.',
    });
  }
};