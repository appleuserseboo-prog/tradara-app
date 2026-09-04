// ==========================================
// FILE: backend/src/controllers/chatController.ts
// ==========================================

import { Request, Response } from 'express';
import { AgentOrchestrator } from '../ai/orchestrator/AgentOrchestrator';
import { ProductContext } from '../ai/prompts/tradaraPromptBuilder';
import { NegotiationRules } from '../services/negotiationEngine';

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
}

/**
 * Express Controller delegating AI chat interactions to the AgentOrchestrator.
 */
export const handleAiChat = async (req: Request<{}, {}, ChatRequestBody>, res: Response): Promise<void> => {
  try {
    const { message, history = [], product, negotiationRules, currentRound = 1 } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Message string is required.',
      });
      return;
    }

    // Execute request through the Agent Orchestrator
    const result = await orchestrator.processRequest({
      message,
      history,
      product,
      negotiationRules,
      currentRound,
      userName: (req as any).user?.name || undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        response: result.responseText,
        quickOffers: result.quickOffers,
        activeProduct: result.activeProduct,
        negotiationEngineOutput: result.negotiationOutput,
        toolExecuted: result.toolExecuted,
      },
    });
  } catch (error: any) {
    console.error('[ChatController Error]:', error);

    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};