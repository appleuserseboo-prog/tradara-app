// ==========================================
// FILE: backend/src/routes/chatRoutes.ts
// ==========================================

import { Router } from 'express';
import { handleAiChat } from '../controllers/chatController';
import { 
  getUserChatSessions, 
  createChatSession, 
  renameChatSession, 
  deleteChatSession 
} from '../controllers/chatSessionController';
// Import authMiddleware correctly from authMiddleware
import { authMiddleware } from '../middleware/authMiddleware'; 

const router = Router();

// AI Chat interaction endpoint supporting streaming and persistence
router.post('/ai-chat', handleAiChat);

// Chat Session management endpoints for logged-in users
router.get('/sessions', authMiddleware, getUserChatSessions);
router.post('/sessions', authMiddleware, createChatSession);
router.patch('/sessions/:sessionId', authMiddleware, renameChatSession);
router.delete('/sessions/:sessionId', authMiddleware, deleteChatSession);

export default router;