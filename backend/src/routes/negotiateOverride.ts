// ==========================================
// FILE: src/routes/negotiateOverride.ts
// ==========================================

import { Router, Request, Response } from 'express';
import { sendWhatsAppTextMessage } from '../services/whatsappService';
import { prisma } from '../services/negotiationPersistenceService';

export const overrideRouter = Router();

interface OverrideRequestBody {
  sessionId: string;
  buyerPhone?: string;
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';
  manualCounterAmount?: number;
  sellerNotes?: string;
  notifyBuyerViaWhatsApp?: boolean;
}

/**
 * POST /api/negotiate/override
 * Allows human sellers to manually intervene in active AI negotiation sessions
 * and persists the decision into MongoDB via Prisma.
 */
overrideRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      buyerPhone,
      action,
      manualCounterAmount,
      sellerNotes,
      notifyBuyerViaWhatsApp = false,
    }: OverrideRequestBody = req.body;

    if (!sessionId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sessionId and action are required.',
      });
    }

    if (action === 'COUNTER' && (manualCounterAmount === undefined || manualCounterAmount === null)) {
      return res.status(400).json({
        success: false,
        error: 'manualCounterAmount is required when action is COUNTER.',
      });
    }

    console.log(
      `[Manual Override Triggered] Session: ${sessionId} | Action: ${action} | Manual Price: $${manualCounterAmount ?? 'N/A'}`
    );

    // 1. Determine new session status and price
    const newStatus = action === 'ACCEPT' ? 'accepted' : action === 'REJECT' ? 'rejected' : 'active';
    const newPrice = action === 'COUNTER' ? manualCounterAmount : action === 'ACCEPT' ? manualCounterAmount : undefined;

    // 2. Update session in MongoDB via Prisma
    let updatedSession = null;
    try {
      updatedSession = await prisma.aiNegotiationSession.update({
        where: { id: sessionId },
        data: {
          status: newStatus,
          ...(newPrice !== undefined && { currentOffer: newPrice }),
          ...(action === 'ACCEPT' && newPrice !== undefined && { agreedPrice: newPrice }),
        },
      });
    } catch (dbErr) {
      console.warn('[Manual Override DB Update Warning]: Session ID not found in AiNegotiationSession', dbErr);
    }

    // 3. Construct seller response message for WhatsApp notify
    let buyerMessage = '';
    if (action === 'ACCEPT') {
      buyerMessage = `Great news! The seller has manually accepted your offer. We are preparing your order details now.`;
    } else if (action === 'REJECT') {
      buyerMessage = `The seller has reviewed the negotiation and declined the current offer. Thank you for your interest!`;
    } else if (action === 'COUNTER') {
      buyerMessage = `The seller has stepped in with a direct counter-offer of $${manualCounterAmount}. Let us know if this works for you!`;
    }

    // 4. Log override message into AiChatMessage history
    if (updatedSession) {
      await prisma.aiChatMessage.create({
        data: {
          sessionId: updatedSession.id,
          sender: 'seller',
          message: `${buyerMessage}\n[Seller Notes: ${sellerNotes || 'Manual override'}]`,
          offerMade: manualCounterAmount ?? null,
        },
      });
    }

    // 5. Transmit WhatsApp message if enabled and phone number exists
    if (notifyBuyerViaWhatsApp && buyerPhone) {
      try {
        await sendWhatsAppTextMessage({
          to: buyerPhone,
          message: buyerMessage,
        });
        console.log(`[Manual Override] WhatsApp notification sent to +${buyerPhone}`);
      } catch (wsError) {
        console.error('[Manual Override WhatsApp Error]:', wsError);
      }
    }

    // 6. Broadcast real-time update to Dashboard over Socket.io
    const io = (req as any).io;
    if (io) {
      io.emit('session_updated', {
        id: sessionId,
        buyerHandle: buyerPhone ? `+${buyerPhone}` : 'N/A',
        currentOffer: manualCounterAmount ?? 0,
        status: action === 'ACCEPT' ? 'ACCEPTED' : action === 'REJECT' ? 'REJECTED' : 'ACTIVE',
        lastUpdated: 'Just now (Manual Intervention)',
        aiReasoning: `Manual override by seller: ${sellerNotes || 'Direct intervention.'}`,
        isManualOverride: true,
      });

      io.emit('override_executed', {
        sessionId,
        action,
        manualCounterAmount,
        sellerNotes,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully executed manual ${action} override for session ${sessionId}.`,
      data: {
        sessionId,
        action,
        manualCounterAmount: manualCounterAmount ?? null,
        sellerNotes: sellerNotes ?? null,
        whatsappNotified: notifyBuyerViaWhatsApp && !!buyerPhone,
      },
    });
  } catch (error: any) {
    console.error('[Negotiation Override Controller Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process negotiation override.',
      details: error.message || error,
    });
  }
});

export default overrideRouter;