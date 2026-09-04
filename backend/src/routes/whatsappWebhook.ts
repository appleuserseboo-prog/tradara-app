// ==========================================
// FILE: src/routes/whatsappWebhook.ts
// ==========================================

import { Router, Request, Response } from 'express';
import {
  computeNegotiationDecision,
  NegotiationContext,
} from '../controller/geminiNegotiationController';
import { sendWhatsAppTextMessage } from '../services/whatsappService';
import { saveNegotiationRound } from '../services/negotiationPersistenceService';

export const whatsappRouter = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'TRADARA_VERIFY_TOKEN_2026';

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
    } else {
      console.error('[WhatsApp Webhook] Verification failed. Token mismatch.');
      return res.sendStatus(403);
    }
  }

  return res.sendStatus(400);
});

/**
 * POST /api/webhook/whatsapp
 * End-to-End Negotiation Pipeline: Webhook -> Gemini AI -> Prisma Persistence -> WhatsApp Sender + Socket.io
 */
whatsappRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    // 1. Instantly respond 200 OK to Meta to avoid webhook retries/timeouts
    res.status(200).send('EVENT_RECEIVED');

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (!message) return;

      const buyerPhone = message.from; // e.g. "2348123456789"
      const messageType = message.type;

      let messageText = '';
      if (messageType === 'text') {
        messageText = message.text.body;
      } else if (messageType === 'button') {
        messageText = message.button.text;
      }

      console.log(`[WhatsApp Webhook] Incoming message from +${buyerPhone}: "${messageText}"`);

      // 2. Extract numeric offer amount from buyer text
      const offerMatch = messageText.match(/\$?(\d+(\.\d+)?)/);
      const offerAmount = offerMatch ? parseFloat(offerMatch[1]) : null;

      if (!offerAmount) {
        console.log(`[WhatsApp Webhook] No numeric offer found in message from +${buyerPhone}.`);
        return;
      }

      const sessionId = `SESS-WA-${buyerPhone.slice(-4)}`;
      const productId = 'PROD-101';
      const io = (req as any).io;

      // 3. Broadcast buyer offer received event over Socket.io
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

      // 4. Construct context for Gemini AI decision calculation
      const negotiationContext: NegotiationContext = {
        sessionId,
        productName: 'Sony WH-1000XM5 Headphones',
        listPrice: 350,
        floorPrice: 280,
        aiPersona: 'BALANCED',
        maxRounds: 5,
        currentRound: 1,
        buyerOffer: offerAmount,
        conversationHistory: [
          {
            sender: 'BUYER',
            amount: offerAmount,
            message: messageText,
          },
        ],
      };

      console.log(`[WhatsApp Webhook] Executing Gemini AI negotiation controller for session ${sessionId}...`);

      // 5. Compute AI counter-offer decision using @google/genai
      const aiDecision = await computeNegotiationDecision(negotiationContext);

      console.log(
        `[WhatsApp Webhook] AI Decision: ${aiDecision.action} | Counter: $${aiDecision.counterAmount}`
      );

      // 6. Persist incoming offer, Gemini AI decision, and reasoning into MongoDB via Prisma
      try {
        await saveNegotiationRound({
          sessionId,
          itemId: productId,
          buyerSession: buyerPhone,
          buyerOffer: offerAmount,
          buyerMessage: messageText,
          aiAction: aiDecision.action as 'ACCEPT' | 'REJECT' | 'COUNTER',
          aiCounterAmount: aiDecision.counterAmount,
          aiReasoning: aiDecision.reasoning,
          aiBuyerMessage: aiDecision.buyerMessage,
          currentRound: 1,
        });
        console.log(`[WhatsApp Webhook] Successfully persisted negotiation round to MongoDB.`);
      } catch (dbError) {
        console.error('[WhatsApp Webhook DB Persistence Error]:', dbError);
      }

      // 7. Send outgoing AI message directly to buyer via Meta WhatsApp API
      await sendWhatsAppTextMessage({
        to: buyerPhone,
        message: `${aiDecision.buyerMessage}`,
      });

      // 8. Broadcast updated session status to Seller Dashboard via Socket.io
      if (io) {
        io.emit('session_updated', {
          id: sessionId,
          productId,
          productName: 'Sony WH-1000XM5 Headphones',
          buyerHandle: `+${buyerPhone}`,
          channel: 'WhatsApp',
          listPrice: 350,
          floorPrice: 280,
          currentOffer: aiDecision.counterAmount,
          rounds: 1,
          status: aiDecision.action === 'ACCEPT' ? 'ACCEPTED' : aiDecision.action === 'REJECT' ? 'REJECTED' : 'ACTIVE',
          lastUpdated: 'Just now',
          aiReasoning: aiDecision.reasoning,
        });
      }
    } catch (error) {
      console.error('[WhatsApp Webhook Pipeline Error]:', error);
    }
  } else {
    res.sendStatus(404);
  }
});

export default whatsappRouter;