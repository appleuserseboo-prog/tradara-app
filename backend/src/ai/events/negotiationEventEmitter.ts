// ==========================================
// FILE: backend/src/ai/events/negotiationEventEmitter.ts
// ==========================================

import { EventEmitter } from 'events';
import { webhookDispatcher, WebhookEventType, WebhookPayload } from '../../services/webhookDispatcher';

class NegotiationEventEmitter extends EventEmitter {}

export const negotiationEvents = new NegotiationEventEmitter();

interface WebhookSubscription {
  storeId: string;
  targetUrl: string;
}

// In-memory registry (can be wired to MongoDB / Prisma)
const subscriptions: WebhookSubscription[] = [];

export function registerWebhookEndpoint(storeId: string, targetUrl: string) {
  subscriptions.push({ storeId, targetUrl });
}

// Global listener for negotiation state changes
negotiationEvents.on(
  'negotiation_event',
  async (event: WebhookEventType, data: WebhookPayload['data']) => {
    const matchingSubscriptions = subscriptions.filter(
      (sub) => sub.storeId === data.storeId
    );

    for (const sub of matchingSubscriptions) {
      // Non-blocking background dispatch
      webhookDispatcher.dispatch(sub.targetUrl, event, data).then((result) => {
        if (!result.success) {
          console.error(
            `[Webhook] Failed delivery to ${sub.targetUrl} for event ${event}: ${result.error}`
          );
        }
      });
    }
  }
);