import prisma from '../lib/prisma';
import { NegotiationEngine } from './negotiationEngine';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ProcessChatMessageInput {
  itemId?: string;
  buyerSession: string;
  buyerId?: string;
  message: string;
  offeredPrice?: number;
  quantity?: number;
  systemPrompt?: string;
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
  private static async gatherMarketplaceIntelligence(itemId?: string, buyerId?: string): Promise<MarketplaceIntelligence> {
    try {
      // Return default intelligence baseline for non-item general sessions to prevent database lookup failures
      if (!itemId || itemId === 'general-ai-session') {
        return {
          itemHistoricalConversions: 0,
          averageAgreedDiscountPercent: 0,
          buyerPastNegotiationCount: 0,
          buyerSuccessfulDeals: 0,
          categoryDemandScore: 0.5,
        };
      }

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
      // Save continuous interaction record with cognitive analytics metadata if model exists
      if ((prisma as any).aiLearningLog) {
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
      }
    } catch (error) {
      // Non-blocking log persistence error handler
      console.warn('Learning log persistence bypassed:', error);
    }
  }

  public static async processMessage(input: ProcessChatMessageInput) {
    const { itemId, buyerSession, buyerId, message, offeredPrice, quantity = 1, systemPrompt: customSystemPrompt } = input;

    // 1. Fetch Item & AI Configuration (Optional for general AI chat sessions)
    const isGeneralSession = !itemId || itemId === 'general-ai-session';
    let item: any = null;

    if (!isGeneralSession) {
      try {
        item = await (prisma as any).item.findUnique({
          where: { id: itemId },
          include: { aiConfig: true, seller: true },
        });
      } catch (err) {
        console.warn('Item lookup bypassed due to invalid format or missing item:', err);
      }
    }

    // 2. Find or Create Negotiation Session
    const dbItemId = isGeneralSession ? null : itemId;

    let session = await (prisma as any).aiNegotiationSession.findFirst({
      where: { buyerSession, itemId: dbItemId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      session = await (prisma as any).aiNegotiationSession.create({
        data: {
          itemId: dbItemId,
          buyerSession,
          buyerId,
          status: 'active',
        },
        include: { messages: true },
      });
    } else if (buyerId && !session.buyerId) {
      await (prisma as any).aiNegotiationSession.update({
        where: { id: session.id },
        data: { buyerId },
      });
    }

    // 3. Cognitive Perception Layer: Run intent classification and gather historic cross-session data
    const perception = this.perceiveBuyerIntent(message, offeredPrice, item?.price || 0);
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

    const isAutoNegotiateActive = Boolean(item && item.aiConfig && item.aiConfig.autoNegotiateEnabled);

    // SCENARIO 1: Buyer submitted a structured numeric offer on an active item
    if (offeredPrice && item) {
      if (!isAutoNegotiateActive) {
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
    // SCENARIO 2: Text question / natural language negotiation / general AI session
    else {
      if (item && !isAutoNegotiateActive && !customSystemPrompt) {
        aiReply = `The price for ${item.stockName || item.title || 'this item'} is fixed at ${item.currency || '₦'}${item.price.toLocaleString()}. Feel free to ask if you have any questions about its specifications!`;
      } else {
        try {
          if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not defined.');
          }

          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const recentHistoryText = (session.messages || [])
            .slice(-6)
            .map((m: any) => `${m.sender.toUpperCase()}: ${m.message}`)
            .join('\n');

          let systemPrompt = customSystemPrompt;

          if (!systemPrompt) {
            if (item) {
              systemPrompt = `
You are TRADARA's AI Sales Assistant representing the seller for "${item.stockName || item.title || 'this item'}".
Your tone: ${item.aiConfig?.aiTone || 'Friendly, professional, and persuasive'}.

--- STRICT SELLER CONSTRAINTS & KNOWLEDGE BASE ---
- Listed Unit Price: ${item.currency || '₦'}${item.price}
- Minimum Floor Price: ${item.currency || '₦'}${item.aiConfig?.minimumPrice || item.price}
- Target Discount Price: ${item.currency || '₦'}${item.aiConfig?.targetPrice || item.price}
- Walkaway Absolute Floor: ${item.currency || '₦'}${item.aiConfig?.walkawayPrice || item.aiConfig?.minimumPrice || item.price}
- Bulk Purchase Minimum Quantity: ${item.aiConfig?.bulkMinQuantity ? item.aiConfig.bulkMinQuantity + ' units' : 'N/A'}
- Bulk Discount Tier: ${item.aiConfig?.bulkDiscountPercent ? item.aiConfig.bulkDiscountPercent + '% off' : 'N/A'}
- Condition: ${item.aiConfig?.productCondition || item.aiConfig?.condition || 'Brand New'}
- Specifications: ${item.aiConfig?.specifications || item.description || 'N/A'}
- Frequently Asked Questions (FAQ): ${item.aiConfig?.faqKnowledgeBase || 'N/A'}
- Warranty: ${item.aiConfig?.warrantyPeriod || 'N/A'}

--- SHORT-TERM SESSION HISTORY ---
${recentHistoryText || 'No prior conversation.'}

--- NEGOTIATION & INTELLIGENCE RULES ---
1. Seamlessly handle flexible phrasing for price negotiation such as "last price", "bottom line", "discount", "how much", or "cheaper". Do not repeat canned or static lines; calculate and provide a dynamic, engaging counter-offer or special discount price near your target price.
2. Answer buyer questions accurately based on specs, condition, and FAQs above.
3. NEVER offer a price lower than ${item.currency || '₦'}${item.aiConfig?.minimumPrice || item.price} per unit.
4. Keep responses concise (2-4 sentences max) suitable for live chat.
`;
            } else {
              systemPrompt = `You are TRADARA AI, an advanced, highly intelligent AI assistant built for TRADARA (acting like ChatGPT/Claude). 
Answer all general inquiries, questions on tech, coding, mathematics, and business insights with absolute precision. 
If the user inquires about buying, pricing, or negotiating a specific product in this general chat without selecting an item card, briefly answer them and explicitly remind them: "It looks like you're asking about a product price or deal! Please click on a specific product card in our catalog to open its dedicated **TRADARA AI Product Assistant** where we can handle live price negotiations directly."`;
            }
          }

          const response = await model.generateContent([
            systemPrompt,
            `Buyer says: "${message}"`
          ]);

          aiReply = response.response.text();
        } catch (error) {
          console.error("Gemini AI Processing Error:", error);
          
          if (item) {
            const minP = item.aiConfig?.minimumPrice || item.price;
            const targetP = item.aiConfig?.targetPrice || item.price;
            const msgLower = message.toLowerCase();

            if (msgLower.includes('last price') || msgLower.includes('bottom line') || msgLower.includes('discount') || msgLower.includes('how much') || msgLower.includes('cheaper')) {
              aiReply = `The listed price for ${item.stockName || item.title || 'this item'} is ${item.currency || '₦'}${item.price.toLocaleString()}. However, for a quick deal right now, I can offer it to you for a special price of ${item.currency || '₦'}${targetP.toLocaleString()}! Shall we lock it in?`;
            } else if (msgLower.includes('how much') || msgLower.includes('price')) {
              aiReply = `The listed price for ${item.stockName || item.title || 'this item'} is ${item.currency || '₦'}${item.price.toLocaleString()}.`;
            } else {
              aiReply = `Regarding ${item.stockName || item.title || 'this item'}: It is crafted with top-tier quality standards. Feel free to ask any specific questions about quality, shipping, or make an offer!`;
            }
          } else {
            const msgLower = message.toLowerCase();
            if (msgLower.includes('buy') || msgLower.includes('price') || msgLower.includes('discount') || msgLower.includes('negotiate') || msgLower.includes('last price')) {
              aiReply = "It looks like you're trying to negotiate or buy a specific item! Please click on a product card to open its dedicated **TRADARA AI Product Assistant** where we can handle price negotiations and deals directly.";
            } else {
              aiReply = `I am TRADARA AI, your advanced assistant. You asked: "${message}". While I can assist with general knowledge, code, and platform guidance, you can also explore our catalog and ask me to negotiate prices on any product you choose!`;
            }
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

  public static async updateSessionStatus(sessionId: string, status: 'active' | 'transferred' | 'closed') {
    const updatedSession = await (prisma as any).aiNegotiationSession.update({
      where: { id: sessionId },
      data: { status },
    });
    return updatedSession;
  }
}