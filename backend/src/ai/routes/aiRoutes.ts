// ==========================================
// FILE: backend/src/ai/routes/aiRoutes.ts
// ==========================================

import { Router, RequestHandler } from 'express';
import { handleStreamChat } from '../controllers/streamController';
import { authenticateUser } from '../../middleware/authMiddleware';

const router = Router();

/**
 * @route   POST /api/ai/chat/stream
 * @desc    Server-Sent Events (SSE) streaming chat endpoint
 * @access  Protected / Guest Accessible (enforced via security context)
 */
router.post(
  '/chat/stream',
  authenticateUser as unknown as RequestHandler,
  handleStreamChat as unknown as RequestHandler
);

/**
 * @route   GET /api/ai/health
 * @desc    Health check endpoint for AI subsystem
 * @access  Public
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    subsystem: 'TRADARA AI Engine',
    timestamp: new Date().toISOString(),
  });
});

export default router;