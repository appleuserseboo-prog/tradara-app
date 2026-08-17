import { Router } from 'express';
import {
  upsertProductAiConfig,
  getProductAiConfig,
  handleChatMessage,
  getNegotiationHistory,
} from '../controller/aiController';
import { authMiddleware } from '../middleware/authMiddleware';
import { AiSalesService } from '../services/aiSalesService';

const router = Router();

// Seller AI Configuration Endpoints
router.post('/config/:itemId', authMiddleware, upsertProductAiConfig);
router.get('/config/:itemId', getProductAiConfig);

// Buyer AI Interaction Endpoints
router.post('/chat', handleChatMessage);
router.get('/history', getNegotiationHistory);

// Status Toggle Endpoint (Switch to Human / Re-enable AI)
router.patch('/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'transferred', 'closed', 'human_agent'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const session = await AiSalesService.updateSessionStatus(sessionId, status);
    return res.json({ success: true, session });
  } catch (error: any) {
    console.error('Update Session Status Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;