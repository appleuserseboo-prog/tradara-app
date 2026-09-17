import { Router } from 'express';
import {
  upsertProductAiConfig,
  getProductAiConfig,
  handleChatMessage,
  getNegotiationHistory
} from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';
import { AiSalesService } from '../services/aiSalesService';

const router = Router();

// ==========================================
// Seller AI Configuration Endpoints
// ==========================================

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
// Primary Tradara AI Chat Endpoint
//
// Supports:
// - General AI
// - Product AI
// - Negotiation
// - Conversation history
// - Session routing
// - Confirmation payloads
// ==========================================

router.post(
  '/chat',
  handleChatMessage
);

// ==========================================
// Existing Buyer Negotiation Endpoint
//
// Kept for backwards compatibility with
// existing Tradara integrations.
// ==========================================

router.post(
  '/negotiation/chat',
  handleChatMessage
);

router.get(
  '/negotiation/history',
  getNegotiationHistory
);

// ==========================================
// Status Toggle Endpoint
// ==========================================

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
        'human_agent'
      ];

      if (
        !status ||
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(
            ', '
          )}`
        });
      }

      const normalizedStatus =
        status === 'human_agent'
          ? 'transferred'
          : status;

      const session =
        await AiSalesService.updateSessionStatus(
          sessionId,
          normalizedStatus as
            | 'active'
            | 'transferred'
            | 'closed'
        );

      return res.json({
        success: true,
        session
      });
    } catch (error: any) {
      console.error(
        'Update Session Status Error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          'Internal server error'
      });
    }
  }
);

export default router;