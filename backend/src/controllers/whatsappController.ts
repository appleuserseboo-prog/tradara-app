// ==========================================
// FILE: backend/src/controllers/whatsappController.ts
// ==========================================

import { Request, Response } from 'express';
import crypto from 'crypto';

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: WhatsAppMessage[];
}

interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export class WhatsAppController {
  private verifyToken: string;
  private appSecret: string;

  constructor() {
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'TRADARA_VERIFY_TOKEN_SECURE';
    this.appSecret = process.env.WHATSAPP_APP_SECRET || '';
  }

  /**
   * Meta Webhook Verification Handshake (GET /api/whatsapp/webhook)
   */
  public verifyWebhook = (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('[WhatsApp Webhook] Verification successful.');
      res.status(200).send(challenge);
    } else {
      console.error('[WhatsApp Webhook] Verification failed. Token mismatch.');
      res.sendStatus(403);
    }
  };

  /**
   * Verify HMAC X-Hub-Signature-256 header from Meta
   */
  private verifySignature(req: Request): boolean {
    if (!this.appSecret) return true; // Skip signature check if appSecret not set in dev

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', this.appSecret);
    const expectedSignature = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Handle Inbound Webhook Notifications (POST /api/whatsapp/webhook)
   */
  public handleInboundEvent = async (req: Request, res: Response): Promise<void> => {
    // 1. Return 200 OK immediately to Meta to prevent timeout/retry cascades
    res.status(200).send('EVENT_RECEIVED');

    try {
      if (!this.verifySignature(req)) {
        console.error('[WhatsApp Webhook] Invalid HMAC signature detected.');
        return;
      }

      const body = req.body as WhatsAppWebhookBody;

      if (body.object !== 'whatsapp_business_account') {
        return;
      }

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              await this.processMessage(message, value.metadata.phone_number_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('[WhatsApp Webhook] Async processing error:', error);
    }
  };

  /**
   * Extract buyer message content and route to Gemini Negotiation Engine
   */
  private async processMessage(message: WhatsAppMessage, phoneNumberId: string): Promise<void> {
    const senderPhoneNumber = message.from;
    let messageText = '';
    let buttonPayloadId = '';

    if (message.type === 'text' && message.text) {
      messageText = message.text.body;
    } else if (message.type === 'interactive' && message.interactive?.button_reply) {
      messageText = message.interactive.button_reply.title;
      buttonPayloadId = message.interactive.button_reply.id;
    } else {
      console.log(`[WhatsApp Webhook] Unsupported message type received: ${message.type}`);
      return;
    }

    console.log(`[WhatsApp Webhook] Inbound from ${senderPhoneNumber}: "${messageText}" ${buttonPayloadId ? `(Button ID: ${buttonPayloadId})` : ''}`);

    // Route message asynchronously to the negotiation pipeline
    await this.dispatchToNegotiationEngine(senderPhoneNumber, messageText, buttonPayloadId, phoneNumberId);
  }

  /**
   * Delegate buyer offer to TRADARA AI Engine and trigger outbound interactive message
   */
  private async dispatchToNegotiationEngine(
    senderPhoneNumber: string,
    buyerMessage: string,
    buttonPayloadId: string,
    phoneNumberId: string
  ): Promise<void> {
    try {
      // Handle button click triggers directly
      if (buttonPayloadId === 'action_accept') {
        await this.sendWhatsAppTextMessage(
          phoneNumberId,
          senderPhoneNumber,
          '🎉 Deal Accepted! Generating your checkout link now...'
        );
        return;
      }

      if (buttonPayloadId === 'action_decline') {
        await this.sendWhatsAppTextMessage(
          phoneNumberId,
          senderPhoneNumber,
          'Offer declined. Feel free to make a new offer anytime!'
        );
        return;
      }

      // Mock AI Counter-Offer logic with Interactive Buttons
      const counterPrice = '$175';
      const bodyText = `TRADARA AI Counter-Offer: We can do ${counterPrice} for this item. How would you like to proceed?`;

      await this.sendWhatsAppInteractiveButtons(
        phoneNumberId,
        senderPhoneNumber,
        bodyText,
        [
          { id: 'action_accept', title: `Accept ${counterPrice}` },
          { id: 'action_counter', title: 'Make Counter-Offer' },
          { id: 'action_decline', title: 'Decline Deal' }
        ]
      );
    } catch (error) {
      console.error(`[WhatsApp Webhook] Failed to dispatch AI response to ${senderPhoneNumber}:`, error);
    }
  }

  /**
   * Send WhatsApp text message via Meta Graph API
   */
  private async sendWhatsAppTextMessage(
    phoneNumberId: string,
    toPhoneNumber: string,
    text: string
  ): Promise<void> {
    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    if (!systemToken) {
      console.warn('[WhatsApp Outbound] System user token missing. Message not sent.');
      return;
    }

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });
  }

  /**
   * Send WhatsApp Interactive Action Buttons via Meta Graph API
   */
  private async sendWhatsAppInteractiveButtons(
    phoneNumberId: string,
    toPhoneNumber: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    if (!systemToken) {
      console.warn('[WhatsApp Outbound] System user token missing. Message not sent.');
      return;
    }

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const formattedButtons = buttons.map((btn) => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.substring(0, 20), // Meta limits button titles to 20 chars
      },
    }));

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: { buttons: formattedButtons },
        },
      }),
    });
  }
}

export const whatsappController = new WhatsAppController();