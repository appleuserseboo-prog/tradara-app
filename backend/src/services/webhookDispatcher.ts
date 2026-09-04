// ==========================================
// FILE: backend/src/services/webhookDispatcher.ts
// ==========================================

import crypto from 'crypto';

export type WebhookEventType =
  | 'negotiation.accepted'
  | 'negotiation.counter_offer'
  | 'negotiation.rejected'
  | 'negotiation.escalated';

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  data: {
    sessionId: string;
    storeId: string;
    productId: string;
    agreedPrice?: number;
    offerPrice?: number;
    currency: string;
    buyerId?: string;
    reason?: string;
  };
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveredAt: string;
}

export class WebhookDispatcher {
  private static instance: WebhookDispatcher;
  private webhookSecret: string;

  private constructor() {
    this.webhookSecret = process.env.WEBHOOK_SIGNING_SECRET || 'default_tradara_signing_secret';
  }

  public static getInstance(): WebhookDispatcher {
    if (!WebhookDispatcher.instance) {
      WebhookDispatcher.instance = new WebhookDispatcher();
    }
    return WebhookDispatcher.instance;
  }

  /**
   * Generates an HMAC SHA-256 signature for payload verification
   */
  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Dispatches a webhook notification to a target URL with retries
   */
  public async dispatch(
    targetUrl: string,
    event: WebhookEventType,
    eventData: WebhookPayload['data'],
    retries = 3
  ): Promise<WebhookDeliveryResult> {
    const payload: WebhookPayload = {
      eventId: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      eventType: event,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    const serializedBody = JSON.stringify(payload);
    const signature = this.generateSignature(serializedBody);

    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < retries) {
      attempt++;
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-TRADARA-Signature': signature,
            'X-TRADARA-Event': event,
            'User-Agent': 'TRADARA-Webhook-Dispatcher/1.0',
          },
          body: serializedBody,
        });

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            deliveredAt: new Date().toISOString(),
          };
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;
      } catch (err: any) {
        lastError = err.message || 'Network error during delivery';
      }

      // Exponential backoff before retry
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    return {
      success: false,
      error: lastError,
      deliveredAt: new Date().toISOString(),
    };
  }
}

export const webhookDispatcher = WebhookDispatcher.getInstance();