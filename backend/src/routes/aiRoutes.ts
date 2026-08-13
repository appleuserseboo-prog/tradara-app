import { Router } from 'express';
import {
  upsertProductAiConfig,
  getProductAiConfig,
  handleChatMessage,
  getNegotiationHistory,
} from '../controller/aiController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Seller AI Configuration Endpoints
router.post('/config/:itemId', authenticateToken, upsertProductAiConfig);
router.get('/config/:itemId', getProductAiConfig);

// Buyer AI Interaction Endpoints
router.post('/chat', handleChatMessage);
router.get('/history', getNegotiationHistory);

export default router;