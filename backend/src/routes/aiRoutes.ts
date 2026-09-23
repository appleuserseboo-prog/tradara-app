// ==========================================
// FILE: backend/src/routes/aiRoutes.ts
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

const router = Router();

// ==========================================
// TRADARA AI — AGENT GATEWAY
// ==========================================
//
// This is the new unified intelligence entry point.
//
// Existing negotiation routes remain intact below.
// The agent gateway will progressively become the
// orchestration layer for general AI, marketplace AI,
// tools, memory, vision, media, research and execution.
//
// Mounted through the existing /api/ai route.
// Therefore:
//
// POST /api/ai/agent
//
// ==========================================

router.use('/agent', agentRoutes);

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