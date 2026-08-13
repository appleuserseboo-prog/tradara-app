import { Router } from 'express';
import {
  upsertProductAiConfig,
  getProductAiConfig,
  handleChatMessage,
  getNegotiationHistory,
} from '../controller/aiController';
// Change 'authenticateToken' to 'authMiddleware'
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Seller AI Configuration Endpoints
router.post('/config/:itemId', authMiddleware, upsertProductAiConfig);
router.get('/config/:itemId', getProductAiConfig);

// Buyer AI Interaction Endpoints
router.post('/chat', handleChatMessage);
router.get('/history', getNegotiationHistory);

export default router;