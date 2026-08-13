import prisma from '../lib/prisma';
import { NegotiationEngine } from './negotiationEngine';

export interface ProcessChatMessageInput {
  itemId: string;
  buyerSession: string;
  buyerId?: string;
  message: string;
  offeredPrice?: number;
}

export class AiSalesService {
  public static async processMessage(input: ProcessChatMessageInput) {
    const { itemId, buyerSession, buyerId, message, offeredPrice } = input;

    // Fetch Item & AI Configuration
    const item = await (prisma as any).item.findUnique({
      where: { id: itemId },
      include: { aiConfig: true, seller: true },
    });

    if (!item) {
      throw new Error('Item not found.');
    }

    // Find or Create Negotiation Session
    let session = await (prisma as any).aiNegotiationSession.findFirst({
      where: {
        itemId,
        buyerSession,
      },
      include: { messages: true },
    });

    if (!session) {
      session = await (prisma as any).aiNegotiationSession.create({
        data: {
          itemId,
          buyerSession,
          buyerId,
          status: 'active',
        },
        include: { messages: true },
      });
    }

    // Store Buyer's incoming message
    await (prisma as any).aiChatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'buyer',
        message,
        offerMade: offeredPrice || null,
      },
    });

    const currentRound = session.roundCount + 1;
    let aiReply = '';
    let dealStatus = session.status;
    let agreedPrice = session.agreedPrice;

    // Negotiation Logic if price offer is present
    if (offeredPrice && item.aiConfig) {
      const result = NegotiationEngine.processOffer(offeredPrice, currentRound, {
        minimumPrice: item.aiConfig.minimumPrice,
        targetPrice: item.aiConfig.targetPrice,
        walkawayPrice: item.aiConfig.walkawayPrice,
        discountStepPercent: item.aiConfig.discountStepPercent,
        maxDiscountRounds: item.aiConfig.maxDiscountRounds,
        autoNegotiateEnabled: item.aiConfig.autoNegotiateEnabled,
      });

      dealStatus = result.status;

      if (result.accepted) {
        agreedPrice = offeredPrice;
        aiReply = `Great news! I can accept your offer of ${item.currency || '₦'}${offeredPrice.toLocaleString()}. Would you like to proceed with this purchase?`;
      } else if (result.counterOffer) {
        aiReply = `Thank you for your offer. The best price we can offer right now is ${item.currency || '₦'}${result.counterOffer.toLocaleString()}. Let me know if that works for you!`;
      } else {
        aiReply = `Thank you for interest. ${result.message}`;
      }
    } else {
      // Knowledge base answer response building
      const tone = item.aiConfig?.aiTone || 'Professional and Friendly';
      const greeting = item.aiConfig?.greetingMessage || `Hello! How can I help you with ${item.stockName}?`;
      
      let extraInfo = '';
      if (item.aiConfig?.faqKnowledgeBase) {
        extraInfo += ` FAQ: ${item.aiConfig.faqKnowledgeBase}`;
      }
      if (item.aiConfig?.specifications) {
        extraInfo += ` Specs: ${item.aiConfig.specifications}`;
      }
      if (item.aiConfig?.warrantyPeriod) {
        extraInfo += ` Warranty: ${item.aiConfig.warrantyPeriod}`;
      }

      aiReply = `${greeting} ${item.description || ''}.${extraInfo ? ' Additional Details: ' + extraInfo : ''}`;
    }

    // Update Session State
    await (prisma as any).aiNegotiationSession.update({
      where: { id: session.id },
      data: {
        roundCount: currentRound,
        currentOffer: offeredPrice || session.currentOffer,
        agreedPrice: agreedPrice || session.agreedPrice,
        status: dealStatus,
      },
    });

    // Save AI Response
    const aiMessage = await (prisma as any).aiChatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'ai',
        message: aiReply,
        offerMade: agreedPrice || null,
      },
    });

    return {
      sessionId: session.id,
      reply: aiReply,
      status: dealStatus,
      agreedPrice,
      aiMessage,
    };
  }
}