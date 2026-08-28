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
  quantity?: number;
}

export interface BuyerPerception {
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'eager';
  urgency: 'low' | 'medium' | 'high';
  priceSensitivity: 'low' | 'medium' | 'high';
  detectedIntent: 'inquiry' | 'bargain' | 'specs_check' | 'human_request' | 'bulk_inquiry' | 'closing';
  estimatedMaxBudget?: number;
}

export interface MarketplaceIntelligence {
  itemHistoricalConversions: number;
  averageAgreedDiscountPercent: number;
  buyerPastNegotiationCount: number;
  buyerSuccessfulDeals: number;
  categoryDemandScore: number;
}

export class AiSalesService {
  /**
   * Perception Module: Analyzes raw message text to evaluate buyer sentiment, urgency, intent, and price sensitivity.
   */
  private static perceiveBuyerIntent(message: string, offeredPrice?: number, listPrice: number = 0): BuyerPerception {
    const msgLower = message.toLowerCase();
    
    // Default perception baseline
    let sentiment: BuyerPerception['sentiment'] = 'neutral';
    let urgency: BuyerPerception['urgency'] = 'medium';
    let priceSensitivity: BuyerPerception['priceSensitivity'] = 'medium';
    let detectedIntent: BuyerPerception['detectedIntent'] = 'inquiry';

    // Sentiment and Urgency Perception
    if (msgLower.includes('urgent') || msgLower.includes('today') || msgLower.includes('now') || msgLower.includes('asap') || msgLower.includes('fast')) {
      urgency = 'high';
      sentiment = 'eager';
    }
    if (msgLower.includes('expensive') || msgLower.includes('too high') || msgLower.includes('ridiculous') || msgLower.includes('scam')) {
      sentiment = 'frustrated';
      priceSensitivity = 'high';
    } else if (msgLower.includes('love') || msgLower.includes('great') || msgLower.includes('perfect') || msgLower.includes('interested')) {
      sentiment = 'positive';
    }

    // Intent Perception
    if (offeredPrice || msgLower.includes('bottom') || msgLower.includes('negotiable') || msgLower.includes('last price') || msgLower.includes('discount') || msgLower.includes('cheaper') || msgLower.includes('how much')) {
      detectedIntent = 'bargain';
      priceSensitivity = 'high';
    } else if (msgLower.includes('spec') || msgLower.includes('condition') || msgLower.includes('warranty') || msgLower.includes('authentic') || msgLower.includes('original')) {
      detectedIntent = 'specs_check';
    } else if (msgLower.includes('wholesale') || msgLower.includes('bulk') || msgLower.includes('quantity') || msgLower.includes('many')) {
      detectedIntent = 'bulk_inquiry';
    } else if (msgLower.includes('human') || msgLower.includes('agent') || msgLower.includes('call') || msgLower.includes('seller') || msgLower.includes('person')) {
      detectedIntent = 'human_request';
    } else if (msgLower.includes('buy') || msgLower.includes('take it') || msgLower.includes('deal') || msgLower.includes('account') || msgLower.includes('pay')) {
      detectedIntent = 'closing';
      urgency = 'high';
    }

    let estimatedMaxBudget: number | undefined;
    if (offeredPrice) {
      estimatedMaxBudget = offeredPrice;
    } else if (listPrice > 0 && priceSensitivity === 'high') {
      estimatedMaxBudget = listPrice * 0.85;
    }

    return {
      sentiment,
      urgency,
      priceSensitivity,
      detectedIntent,
      estimatedMaxBudget,
    };
  }

  /**
   * Intelligence & Perception Engine: Retrieves historical cross-session marketplace data to adjust negotiation dynamic behavior.
   */
  private static async gatherMarketplaceIntelligence(itemId: string, buyerId?: string): Promise<MarketplaceIntelligence> {
    try {
      // 1. Fetch historical conversion statistics for this item
      const itemPastSessions = await (prisma as any).aiNegotiationSession.findMany({
        where: { itemId, status: 'agreed' },
        take: 20,
      });

      const itemHistoricalConversions = itemPastSessions.length;
      
      let averageAgreedDiscountPercent = 0;
      if (itemHistoricalConversions > 0) {
        const totalDiscounts = itemPastSessions.reduce((acc: number, s: any) => {
          if (s.agreedPrice && s.currentOffer) {
            return acc + ((s.currentOffer - s.agreedPrice) / s.currentOffer);
          }
          return acc;
        }, 0);
        averageAgreedDiscountPercent = (totalDiscounts / itemHistoricalConversions) * 100;
      }

      // 2. Fetch past buyer behavior if authenticated
      let buyerPastNegotiationCount = 0;
      let buyerSuccessfulDeals = 0;

      if (buyerId) {
        const buyerSessions = await (prisma as any).aiNegotiationSession.findMany({
          where: { buyerId },
        });
        buyerPastNegotiationCount = buyerSessions.length;
        buyerSuccessfulDeals = buyerSessions.filter((s: any) => s.status === 'agreed').length;
      }

      return {
        itemHistoricalConversions,
        averageAgreedDiscountPercent: Number(averageAgreedDiscountPercent.toFixed(2)),
        buyerPastNegotiationCount,
        buyerSuccessfulDeals,
        categoryDemandScore: itemHistoricalConversions > 10 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('Error gathering marketplace intelligence:', error);
      return {
        itemHistoricalConversions: 0,
        averageAgreedDiscountPercent: 0,
        buyerPastNegotiationCount: 0,
        buyerSuccessfulDeals: 0,
        categoryDemandScore: 0.5,
      };
    }
  }

  /**
   * Learning Loop Engine: Continuous post-interaction hook that records message patterns, outcomes, and perception states for offline model fine-tuning.
   */
  private static async recordInteractionLearning(
    sessionId: string,
    buyerMessage: string,
    aiResponse: string,
    perception: BuyerPerception,
    dealStatus: string
  ): Promise<void> {
    try {
      // Save continuous interaction record with cognitive analytics metadata
      await (prisma as any).aiLearningLog.create({
        data: {
          sessionId,
          buyerMessage,
          aiResponse,
          perceivedSentiment: perception.sentiment,
          perceivedUrgency: perception.urgency,
          detectedIntent: perception.detectedIntent,
          dealStatus,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Non-blocking log persistence error handler
      console.warn('Learning log persistence bypassed:', error);
    }
  }

  public static async processMessage(input: ProcessChatMessageInput) {
    const { itemId, buyerSession, buyerId, message, offeredPrice, quantity = 1 } = input;

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
      include: { messages: { orderBy: { createdAt: 'asc' } } },
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
    } else if (buyerId && !session.buyerId) {
      // Backfill buyerId if user was guest and later authenticated
      await (prisma as any).aiNegotiationSession.update({
        where: { id: session.id },
        data: { buyerId },
      });
    }

    // 3. Cognitive Perception Layer: Run intent classification and gather historic cross-session data
    const perception = this.perceiveBuyerIntent(message, offeredPrice, item.price);
    const intelligence = await this.gatherMarketplaceIntelligence(itemId, buyerId);

    // 4. Store Buyer's incoming message
    await (prisma as any).aiChatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'buyer',
        message,
        offerMade: offeredPrice || null,
      },
    });

    // 5. CHECK IF TRANSFERRED TO HUMAN AGENT (BYPASS AI)
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
        perception,
        intelligence,
      };
    }

    const currentRound = session.roundCount + 1;
    let aiReply = '';
    let dealStatus = session.status;
    let agreedPrice = session.agreedPrice;

    // Check if AI negotiation is configured and enabled for this item
    const isAutoNegotiateActive = Boolean(item.aiConfig && item.aiConfig.autoNegotiateEnabled);

    // SCENARIO 1: Buyer submitted a structured numeric offer
    if (offeredPrice) {
      if (!isAutoNegotiateActive) {
        // No AI config or auto-negotiate disabled -> Cannot auto-accept discounts
        aiReply = `Thank you for your offer of ${item.currency || '₦'}${offeredPrice.toLocaleString()}. This item has a fixed price of ${item.currency || '₦'}${item.price.toLocaleString()}. If you would like to negotiate further, please request to connect with a human agent.`;
      } else {
        const result = NegotiationEngine.processOffer(offeredPrice, currentRound, {
          minimumPrice: item.aiConfig.minimumPrice || item.price,
          targetPrice: item.aiConfig.targetPrice || item.price,
          walkawayPrice: item.aiConfig.walkawayPrice || item.aiConfig.minimumPrice || item.price,
          discountStepPercent: item.aiConfig.discountStepPercent ?? 5,
          maxDiscountRounds: item.aiConfig.maxDiscountRounds ?? 3,
          autoNegotiateEnabled: item.aiConfig.autoNegotiateEnabled,
          bulkMinQuantity: item.aiConfig.bulkMinQuantity || 0,
          bulkDiscountPercent: item.aiConfig.bulkDiscountPercent || 0,
          requestedQuantity: quantity,
        });

        dealStatus = result.status;

        if (result.accepted) {
          agreedPrice = offeredPrice;
          aiReply = `Great news! I can accept your offer of ${item.currency || '₦'}${offeredPrice.toLocaleString()} per unit for ${quantity} unit(s). Would you like to proceed with this purchase?`;
        } else if (result.counterOffer) {
          aiReply = `Thank you for your offer. The best price we can offer right now is ${item.currency || '₦'}${result.counterOffer.toLocaleString()} per unit. Let me know if that works for you!`;
        } else {
          aiReply = `Thank you for your interest. ${result.message}`;
        }
      }
    } 
    // SCENARIO 2: Text question / natural language negotiation
    else {
      if (!isAutoNegotiateActive) {
        // If no AI config exists or auto-negotiation is disabled, explicitly state the list price is firm
        aiReply = `The price for ${item.stockName || item.title || 'this item'} is fixed at ${item.currency || '₦'}${item.price.toLocaleString()}. Feel free to ask if you have any questions about its specifications!`;
      } else {
        // AI Config IS enabled -> Use Gemini with strict seller parameters
        try {
          if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not defined.');
          }

          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          // Assemble Short-Term Memory Context from historic message chain
          const recentHistoryText = (session.messages || [])
            .slice(-6)
            .map((m: any) => `${m.sender.toUpperCase()}: ${m.message}`)
            .join('\n');

          const systemPrompt = `
You are TRADARA's AI Sales Assistant representing the seller for "${item.stockName || item.title || 'this item'}".
Your tone: ${item.aiConfig?.aiTone || 'Friendly, professional, and persuasive'}.

--- STRICT SELLER CONSTRAINTS & KNOWLEDGE BASE ---
- Listed Unit Price: ${item.currency || '₦'}${item.price}
- Minimum Floor Price: ${item.currency || '₦'}${item.aiConfig?.minimumPrice || item.price}
- Target Discount Price: ${item.currency || '₦'}${item.aiConfig?.targetPrice || item.price}
- Walkaway Absolute Floor: ${item.currency || '₦'}${item.aiConfig?.walkawayPrice || item.aiConfig?.minimumPrice || item.price}
- Bulk Purchase Minimum Quantity required for bulk discount: ${item.aiConfig?.bulkMinQuantity ? item.aiConfig.bulkMinQuantity + ' units' : 'N/A (No bulk tier defined)'}
- Bulk Discount Tier: ${item.aiConfig?.bulkDiscountPercent ? item.aiConfig.bulkDiscountPercent + '% off' : 'N/A'}
- Condition: ${item.aiConfig?.condition || 'Not specified'}
- Specifications: ${item.aiConfig?.specifications || item.description || 'N/A'}
- Frequently Asked Questions (FAQ): ${item.aiConfig?.faqKnowledgeBase || 'N/A'}
- Warranty: ${item.aiConfig?.warrantyPeriod || 'N/A'}
- Pickup / Contact info: ${item.aiConfig?.pickupAddress || 'Available via platform chat'}

--- REAL-TIME PERCEPTION & MARKETPLACE INTELLIGENCE ---
- Perceived Buyer Intent: ${perception.detectedIntent}
- Perceived Sentiment: ${perception.sentiment}
- Perceived Urgency: ${perception.urgency}
- Historical Item Conversion Rate: ${intelligence.itemHistoricalConversions} successful deals closed.
- Buyer Past Platform Success: ${intelligence.buyerSuccessfulDeals} of ${intelligence.buyerPastNegotiationCount} chats converted.

--- SHORT-TERM SESSION HISTORY ---
${recentHistoryText || 'No prior conversation.'}

--- NEGOTIATION RULES ---
1. Answer buyer questions accurately based on the specs, condition, and FAQs above.
2. NEVER offer a price lower than ${item.currency || '₦'}${item.aiConfig?.minimumPrice || item.price} per unit.
3. BULK QUANTITY RULE: If the buyer asks for a wholesale or bulk discount, inform them that bulk pricing requires a minimum purchase of ${item.aiConfig?.bulkMinQuantity || 'seller-defined'} units. Do NOT grant bulk discounts for orders below this minimum threshold.
4. If the buyer asks for "last price", "bottom line", or if price is negotiable for single units:
   - Acknowledge that discounts are possible.
   - Do NOT give away the absolute floor (${item.currency || '₦'}${item.aiConfig?.walkawayPrice || item.aiConfig?.minimumPrice || item.price}) immediately.
   - Proactively suggest a reasonable initial price near ${item.currency || '₦'}${item.aiConfig?.targetPrice || item.price}.
5. OFF-TOPIC RULE: If the buyer asks questions unrelated to the item or trading on TRADARA (e.g., "what is machine learning"), politely state that you are the product sales assistant for this item, and redirect them back to discuss the item's features or price.
6. Adapt your response style based on buyer sentiment: If sentiment is frustrated or urgency is high, keep it ultra-direct.
7. Keep responses concise (2-4 sentences max) suitable for live chat.
`;

          const response = await model.generateContent([
            systemPrompt,
            `Buyer says: "${message}"`
          ]);

          aiReply = response.response.text();
        } catch (error) {
          console.error("Gemini AI Processing Error:", error);
          
          // Rule-based deterministic fallback when API key is missing or model fails
          const minP = item.aiConfig?.minimumPrice || item.price;
          const targetP = item.aiConfig?.targetPrice || item.price;
          const msgLower = message.toLowerCase();

          if (msgLower.includes('how much') || msgLower.includes('price')) {
            aiReply = `The listed price for ${item.stockName || item.title || 'this item'} is ${item.currency || '₦'}${item.price.toLocaleString()}.`;
          } else if (msgLower.includes('bottom') || msgLower.includes('negotiable') || msgLower.includes('less') || msgLower.includes('last price') || msgLower.includes('discount')) {
            if (targetP < item.price) {
              aiReply = `The listed price is ${item.currency || '₦'}${item.price.toLocaleString()}, but I can offer it to you for ${item.currency || '₦'}${targetP.toLocaleString()} for a quick deal!`;
            } else if (minP < item.price) {
              aiReply = `The listed price is ${item.currency || '₦'}${item.price.toLocaleString()}, but we can consider offers down to ${item.currency || '₦'}${minP.toLocaleString()}.`;
            } else {
              aiReply = `The price for ${item.stockName || item.title || 'this item'} is firm at ${item.currency || '₦'}${item.price.toLocaleString()}.`;
            }
          } else if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey')) {
            aiReply = `Hello! How can I help you today regarding ${item.stockName || item.title || 'this product'}?`;
          } else {
            aiReply = `I am TRADARA's sales assistant for ${item.stockName || item.title || 'this item'} (Listed: ${item.currency || '₦'}${item.price.toLocaleString()}). How can I assist you with its details or pricing?`;
          }
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

    // Fire Continuous Learning Pipeline asynchronously
    this.recordInteractionLearning(session.id, message, aiReply, perception, dealStatus);

    return {
      sessionId: session.id,
      reply: aiReply,
      status: dealStatus,
      agreedPrice,
      aiMessage,
      perception,
      intelligence,
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