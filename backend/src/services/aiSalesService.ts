import prisma from '../lib/prisma';
import { NegotiationEngine } from './negotiationEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    // 1. Fetch Item & AI Configuration
    const item = await (prisma as any).item.findUnique({
      where: { id: itemId },
      include: { aiConfig: true, seller: true },
    });

    if (!item) {
      throw new Error('Item not found.');
    }

    // 2. Find or Create Negotiation Session
    let session = await (prisma as any).aiNegotiationSession.findFirst({
      where: { itemId, buyerSession },
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

    // 3. Store Buyer's incoming message
    await (prisma as any).aiChatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'buyer',
        message,
        offerMade: offeredPrice || null,
      },
    });

    // 4. CHECK IF TRANSFERRED TO HUMAN AGENT (BYPASS AI)
    if (session.status === 'transferred' || session.status === 'human_agent') {
      const waitReply = "A live agent has received your message and will respond shortly.";

      const aiMessage = await (prisma as any).aiChatMessage.create({
        data: {
          sessionId: session.id,
          sender: 'system',
          message: waitReply,
        },
      });

      return {
        sessionId: session.id,
        reply: waitReply,
        status: session.status,
        agreedPrice: session.agreedPrice,
        aiMessage,
      };
    }

    const currentRound = session.roundCount + 1;
    let aiReply = '';
    let dealStatus = session.status;
    let agreedPrice = session.agreedPrice;

    // SCENARIO 1: Buyer submitted a structured numeric offer
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
        aiReply = `Thank you for your interest. ${result.message}`;
      }
    } 
    // SCENARIO 2: Text question / natural language negotiation
    else {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `
You are TRADARA's AI Sales Assistant representing the seller for "${item.stockName || item.title || 'this item'}".
Your tone: ${item.aiConfig?.aiTone || 'Friendly, professional, and persuasive'}.

--- PRODUCT DETAILS & KNOWLEDGE BASE ---
- Listed Price: ${item.currency || '₦'}${item.price}
- Minimum Acceptable Price: ${item.currency || '₦'}${item.aiConfig?.minimumPrice || item.price}
- Target Price: ${item.currency || '₦'}${item.aiConfig?.targetPrice || item.price}
- Walkaway Absolute Floor: ${item.currency || '₦'}${item.aiConfig?.walkawayPrice || item.aiConfig?.minimumPrice || item.price}
- Condition: ${item.aiConfig?.condition || 'Not specified'}
- Specifications: ${item.aiConfig?.specifications || item.description || 'N/A'}
- Frequently Asked Questions (FAQ): ${item.aiConfig?.faqKnowledgeBase || 'N/A'}
- Warranty: ${item.aiConfig?.warrantyPeriod || 'N/A'}
- Pickup / Contact info: ${item.aiConfig?.pickupAddress || 'Available via platform chat'}

--- NEGOTIATION & ANSWER RULES ---
1. Answer buyer questions accurately based on the specs, condition, and FAQs above.
2. If the buyer asks for a discount, bottom line, or if price is negotiable:
   - Acknowledge that discounts are possible.
   - Do NOT immediately give away the absolute walkaway floor (${item.currency || '₦'}${item.aiConfig?.walkawayPrice || item.price}).
   - Proactively suggest a reasonable first discount price near ${item.currency || '₦'}${item.aiConfig?.targetPrice || item.price} or invite them to submit an offer using the price offer field.
3. Keep responses concise (2-4 sentences max) suitable for live chat.
`;

        const response = await model.generateContent([
          systemPrompt,
          `Buyer says: "${message}"`
        ]);

        aiReply = response.response.text();
      } catch (error) {
        console.error("Gemini AI Processing Error:", error);
        
        const minP = item.aiConfig?.minimumPrice || item.price;
        const msgLower = message.toLowerCase();

        if (msgLower.includes('bottom') || msgLower.includes('negotiable') || msgLower.includes('less')) {
          aiReply = `The item is listed at ${item.currency || '₦'}${item.price}. However, we can negotiate down to around ${item.currency || '₦'}${minP} for a quick deal!`;
        } else {
          aiReply = `Thank you for asking about ${item.stockName || 'this item'}. ${item.description || 'How can I assist you with this product?'}`;
        }
      }
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

  // Method to allow switching session status (Switch to Human / Re-enable AI)
  public static async updateSessionStatus(sessionId: string, status: 'active' | 'transferred' | 'closed') {
    const updatedSession = await (prisma as any).aiNegotiationSession.update({
      where: { id: sessionId },
      data: { status },
    });
    return updatedSession;
  }
}