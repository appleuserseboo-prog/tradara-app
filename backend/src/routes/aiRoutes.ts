// ==========================================
// FILE: backend/src/routes/aiRoutes.ts
// TRADARA AI — Unified AI Routes
// ==========================================

import { Router } from 'express';

import {
  upsertProductAiConfig,
  getProductAiConfig,
  handleChatMessage,
  getNegotiationHistory,
} from '../controllers/aiController';

import { authMiddleware } from '../middleware/authMiddleware';

import { AiSalesService } from '../services/aiSalesService';

import agentRoutes from './agentRoutes';

import {
  executeAgentRequest,
} from '../controllers/agentController';

const router = Router();

// ==========================================
// TRADARA AI — UNIFIED AGENT GATEWAY
// ==========================================
//
// These two endpoints intentionally point to
// the same agent controller:
//
// POST /api/ai/agent
// POST /api/ai/chat
//
// /agent is the canonical agent endpoint.
//
// /chat is the compatibility endpoint used by
// the existing Tradara frontend.
//
// This allows the frontend to use:
//
// POST /api/ai/chat
//
// without bypassing the new AgentOrchestrator.
//
// ==========================================

// Canonical agent gateway
router.use('/agent', agentRoutes);

// Frontend-compatible AI chat gateway
router.post(
  '/chat',
  executeAgentRequest
);

// ==========================================
// EXISTING PRODUCT AI CONFIGURATION
// ==========================================

// Seller AI Configuration Endpoints
router.post(
  '/config/:itemId',
  authMiddleware,
  upsertProductAiConfig
);

router.get(
  '/config/:itemId',
  getProductAiConfig
);

// ==========================================
// EXISTING NEGOTIATION AI
// ==========================================

// Buyer AI Interaction Endpoints
router.post(
  '/negotiation/chat',
  handleChatMessage
);

router.get(
  '/negotiation/history',
  getNegotiationHistory
);

// ==========================================
// EXISTING SESSION STATUS
// ==========================================

// Status Toggle Endpoint
// Switch to Human / Re-enable AI
router.patch(
  '/session/:sessionId/status',
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { status } = req.body;

      const validStatuses = [
        'active',
        'transferred',
        'closed',
        'human_agent',
      ];

      if (
        !status ||
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(
            ', '
          )}`,
        });
      }

      const session =
        await AiSalesService.updateSessionStatus(
          sessionId,
          status as
            | 'active'
            | 'transferred'
            | 'closed'
        );

      return res.json({
        success: true,
        session,
      });
    } catch (error: any) {
      console.error(
        'Update Session Status Error:',
        error
      );

      return res.status(500).json({
        error:
          error?.message ||
          'Internal server error',
      });
    }
  }
);

export default router;