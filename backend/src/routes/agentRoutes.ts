// ==========================================
// FILE: backend/src/routes/agentRoutes.ts
// TRADARA AI — Agent Gateway Routes
// ==========================================

import { Router } from 'express';

import {
  executeAgentRequest,
} from '../controllers/agentController';

const router = Router();

/**
 * POST /agent
 *
 * Unified Tradara Agent Gateway.
 *
 * Supports:
 * - General intelligence
 * - Marketplace intelligence
 * - Agent routing
 * - Structured context
 * - Attachments
 * - Streaming
 * - Future tool execution
 * - Future multimodal processing
 * - Future web/research tools
 */
router.post('/', executeAgentRequest);

export default router;