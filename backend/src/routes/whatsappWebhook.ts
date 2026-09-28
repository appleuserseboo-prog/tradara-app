// ==========================================
// FILE: src/routes/whatsappWebhook.ts
// ==========================================

import { Router, Request, Response } from 'express';
import {
  computeNegotiationDecision,
  NegotiationContext,
} from '../controllers/geminiNegotiationController';
import { sendWhatsAppTextMessage } from '../services/whatsappService';
import { saveNegotiationRound } from '../services/negotiationPersistenceService';

export const whatsappRouter = Router();

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || 'TRADARA_VERIFY_TOKEN_2026';

/**
 * GET /api/webhook/whatsapp
 * Meta Webhook Verification Endpoint
 */
whatsappRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verification successful.');
      return res.status(200).send(challenge);
    }

    console.error(
      '[WhatsApp Webhook] Verification failed. Token mismatch.'
    );

    return res.sendStatus(403);
  }

  return res.sendStatus(400);
});

/**
 * POST /api/webhook/whatsapp
 *
 * End-to-End Negotiation Pipeline:
 *
 * WhatsApp Webhook
 *       ↓
 * Extract Buyer Message
 *       ↓
 * Extract Offer
 *       ↓
 * Gemini AI Negotiation Controller
 *       ↓
 * Persist Negotiation Round
 *       ↓
 * Send AI Response to Buyer
 *       ↓
 * Socket.io Seller Dashboard Update
 */
whatsappRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  /**
   * Only process WhatsApp Business Account webhook events.
   */
  if (body?.object !== 'whatsapp_business_account') {
    return res.sendStatus(404);
  }

  /**
   * Respond immediately to Meta.
   *
   * WhatsApp expects the webhook endpoint to acknowledge the event quickly.
   * The actual negotiation processing continues asynchronously below.
   */
  res.status(200).send('EVENT_RECEIVED');

  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    /**
     * Ignore webhook events that do not contain a message.
     *
     * This can happen for delivery receipts, read receipts,
     * status updates, etc.
     */
    if (!message) {
      console.log(
        '[WhatsApp Webhook] Webhook event contained no incoming message.'
      );

      return;
    }

    const buyerPhone = message.from;
    const messageType = message.type;

    /**
     * Extract message text from supported WhatsApp message types.
     */
    let messageText = '';

    if (messageType === 'text') {
      messageText = message.text?.body || '';
    } else if (messageType === 'button') {
      messageText = message.button?.text || '';
    }

    messageText = String(messageText).trim();

    console.log(
      `[WhatsApp Webhook] Incoming message from +${buyerPhone}: "${messageText}"`
    );

    /**
     * Ignore messages that do not contain usable text.
     */
    if (!messageText) {
      console.log(
        `[WhatsApp Webhook] Empty or unsupported message from +${buyerPhone}.`
      );

      return;
    }

    /**
     * Extract numeric offer amount from buyer text.
     *
     * Examples:
     * "$300"      -> 300
     * "300"       -> 300
     * "$299.50"   -> 299.50
     * "I can do 280" -> 280
     */
    const offerMatch = messageText.match(/\$?(\d+(?:\.\d+)?)/);

    const offerAmount = offerMatch
      ? Number.parseFloat(offerMatch[1])
      : null;

    /**
     * This WhatsApp route is specifically the negotiation pipeline.
     * Therefore a numeric offer is required.
     */
    if (offerAmount === null || !Number.isFinite(offerAmount)) {
      console.log(
        `[WhatsApp Webhook] No numeric offer found in message from +${buyerPhone}.`
      );

      return;
    }

    /**
     * Reject invalid negative/zero offers.
     */
    if (offerAmount <= 0) {
      console.log(
        `[WhatsApp Webhook] Invalid offer amount from +${buyerPhone}: ${offerAmount}`
      );

      return;
    }

    /**
     * Basic webhook/session identifiers.
     *
     * These values currently match the existing WhatsApp negotiation
     * implementation and seller dashboard event structure.
     */
    const sessionId = `SESS-WA-${buyerPhone.slice(-4)}`;
    const productId = 'PROD-101';

    /**
     * Socket.io instance is attached to the Express request
     * by the backend server.
     */
    const io = (req as any).io;

    /**
     * Product information currently used by the WhatsApp
     * negotiation demonstration/integration.
     */
    const listedPrice = 350;
    const minimumPrice = 280;
    const targetPrice = 320;

    // ==========================================
    // 3. BROADCAST BUYER OFFER RECEIVED
    // ==========================================

    if (io) {
      io.emit('offer_received', {
        sessionId,
        productId,
        buyerHandle: `+${buyerPhone}`,
        offerAmount,
        round: 1,
        timestamp: new Date().toISOString(),
      });
    }

    // ==========================================
    // 4. CONSTRUCT GEMINI NEGOTIATION CONTEXT
    // ==========================================

    /**
     * This object intentionally follows the current Phase 2
     * NegotiationContext contract:
     *
     * listedPrice
     * minimumPrice
     * targetPrice
     * buyerMessage
     * buyerOffer
     * previousMessages
     *
     * Do NOT replace these with the old:
     *
     * listPrice
     * floorPrice
     * aiPersona
     * maxRounds
     * currentRound
     * conversationHistory
     *
     * because the current Gemini negotiation controller uses
     * the Phase 2 contract.
     */
    const negotiationContext: NegotiationContext = {
      productName: 'Sony WH-1000XM5 Headphones',

      productDescription:
        'Sony WH-1000XM5 wireless noise-cancelling headphones.',

      listedPrice,

      minimumPrice,

      targetPrice,

      currency: '$',

      buyerMessage: messageText,

      buyerOffer: offerAmount,

      quantity: 1,

      previousMessages: [
        {
          role: 'user',
          content: messageText,
        },
      ],
    };

    console.log(
      `[WhatsApp Webhook] Executing Gemini AI negotiation controller for session ${sessionId}...`
    );

    // ==========================================
    // 5. COMPUTE GEMINI AI NEGOTIATION DECISION
    // ==========================================

    const aiDecision = await computeNegotiationDecision(
      negotiationContext
    );

    console.log(
      `[WhatsApp Webhook] AI Decision: ${aiDecision.action} | Counter: $${aiDecision.counterAmount ?? 'N/A'}`
    );

    /**
     * The Gemini negotiation controller uses lowercase action names:
     *
     * accept
     * reject
     * counter
     * ask
     * human
     *
     * The existing persistence layer expects:
     *
     * ACCEPT
     * REJECT
     * COUNTER
     *
     * Normalize the result here so the persistence contract remains
     * stable without changing the AI controller.
     */
    let persistenceAction: 'ACCEPT' | 'REJECT' | 'COUNTER';

    switch (aiDecision.action) {
      case 'accept':
        persistenceAction = 'ACCEPT';
        break;

      case 'reject':
        persistenceAction = 'REJECT';
        break;

      case 'counter':
      case 'ask':
      case 'human':
      default:
        persistenceAction = 'COUNTER';
        break;
    }

    /**
     * Always provide a numeric value to downstream systems.
     *
     * If the AI accepts/rejects without a counter amount,
     * the buyer's original offer is used as the dashboard's
     * current offer value.
     */
    const dashboardOffer =
      typeof aiDecision.counterAmount === 'number' &&
      Number.isFinite(aiDecision.counterAmount)
        ? aiDecision.counterAmount
        : offerAmount;

    // ==========================================
    // 6. PERSIST NEGOTIATION ROUND
    // ==========================================

    try {
      await saveNegotiationRound({
        sessionId,
        itemId: productId,
        buyerSession: buyerPhone,
        buyerOffer: offerAmount,
        buyerMessage: messageText,

        aiAction: persistenceAction,

        aiCounterAmount: aiDecision.counterAmount,

        aiReasoning:
          aiDecision.reason ||
          `Tradara AI selected the ${aiDecision.action} negotiation action.`,

        aiBuyerMessage: aiDecision.message,

        currentRound: 1,
      });

      console.log(
        '[WhatsApp Webhook] Successfully persisted negotiation round to MongoDB.'
      );
    } catch (dbError) {
      /**
       * Database persistence failure should not prevent the AI
       * from responding to the buyer.
       */
      console.error(
        '[WhatsApp Webhook DB Persistence Error]:',
        dbError
      );
    }

    // ==========================================
    // 7. SEND AI RESPONSE TO BUYER
    // ==========================================

    const buyerResponse =
      aiDecision.message?.trim() ||
      'Thanks for your offer. Let me review that negotiation.';

    try {
      await sendWhatsAppTextMessage({
        to: buyerPhone,
        message: buyerResponse,
      });

      console.log(
        `[WhatsApp Webhook] AI response successfully sent to +${buyerPhone}.`
      );
    } catch (whatsappError) {
      /**
       * WhatsApp delivery errors are logged independently so that
       * the negotiation result remains available to the seller dashboard.
       */
      console.error(
        '[WhatsApp Webhook WhatsApp Delivery Error]:',
        whatsappError
      );
    }

    // ==========================================
    // 8. BROADCAST UPDATED SESSION TO SELLER DASHBOARD
    // ==========================================

    if (io) {
      const sessionStatus =
        aiDecision.action === 'accept'
          ? 'ACCEPTED'
          : aiDecision.action === 'reject'
            ? 'REJECTED'
            : 'ACTIVE';

      io.emit('session_updated', {
        id: sessionId,

        productId,

        productName: 'Sony WH-1000XM5 Headphones',

        buyerHandle: `+${buyerPhone}`,

        channel: 'WhatsApp',

        listPrice: listedPrice,

        floorPrice: minimumPrice,

        currentOffer: dashboardOffer,

        rounds: 1,

        status: sessionStatus,

        lastUpdated: 'Just now',

        aiReasoning:
          aiDecision.reason ||
          `Tradara AI selected the ${aiDecision.action} negotiation action.`,
      });
    }

    console.log(
      `[WhatsApp Webhook] Negotiation pipeline completed for session ${sessionId}.`
    );
  } catch (error) {
    /**
     * The webhook has already returned EVENT_RECEIVED to Meta,
     * so this error is logged rather than attempting another HTTP response.
     */
    console.error(
      '[WhatsApp Webhook Pipeline Error]:',
      error
    );
  }
});

export default whatsappRouter;