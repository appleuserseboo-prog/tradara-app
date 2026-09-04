// ==========================================
// FILE: backend/src/routes/whatsappRoutes.ts
// ==========================================

import { Router } from 'express';
import { whatsappController } from '../controllers/whatsappController';

const router = Router();

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Meta Webhook Verification Handshake
 * @access  Public (Meta Graph API)
 */
router.get('/webhook', whatsappController.verifyWebhook);

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Inbound WhatsApp Event Notification Handler
 * @access  Public (Meta Graph API with HMAC Signature)
 */
router.post('/webhook', whatsappController.handleInboundEvent);

export default router;