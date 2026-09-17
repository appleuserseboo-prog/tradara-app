// ==========================================
// FILE: backend/src/controllers/aiController.ts
// ==========================================

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AiSalesService } from '../services/aiSalesService';

export const upsertProductAiConfig = async (
  req: Request,
  res: Response
) => {
  try {
    const itemIdParam = req.params.itemId;

    const itemId = Array.isArray(itemIdParam)
      ? itemIdParam[0]
      : itemIdParam;

    const configData = req.body;

    const existingItem =
      await (prisma as any).item.findUnique({
        where: { id: itemId }
      });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const aiConfig =
      await (prisma as any).productAiConfig.upsert({
        where: { itemId },
        update: {
          ...configData
        },
        create: {
          itemId,
          ...configData
        }
      });

    return res.status(200).json({
      success: true,
      aiConfig
    });
  } catch (error: any) {
    console.error(
      '[AI Controller] Config update error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Failed to update AI configuration'
    });
  }
};

export const getProductAiConfig = async (
  req: Request,
  res: Response
) => {
  try {
    const itemIdParam = req.params.itemId;

    const itemId = Array.isArray(itemIdParam)
      ? itemIdParam[0]
      : itemIdParam;

    const aiConfig =
      await (prisma as any).productAiConfig.findUnique({
        where: { itemId }
      });

    if (!aiConfig) {
      return res.status(404).json({
        success: false,
        error:
          'AI Configuration not found for this item'
      });
    }

    return res.status(200).json({
      success: true,
      aiConfig
    });
  } catch (error: any) {
    console.error(
      '[AI Controller] Config fetch error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Failed to fetch AI configuration'
    });
  }
};

// ==========================================
// General AI / Negotiation Chat
// ==========================================

export const handleChatMessage = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      itemId,
      buyerSession,
      buyerId,
      message,
      offeredPrice,
      quantity,
      history = [],
      conversationHistory = [],
      sessionId,
      userConfirmationConfirmed,
      pendingTool
    } = req.body || {};

    const cleanMessage =
      typeof message === 'string'
        ? message.trim()
        : '';

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        error: 'A valid message is required.'
      });
    }

    const resolvedBuyerSession =
      typeof buyerSession === 'string' &&
      buyerSession.trim()
        ? buyerSession.trim()
        : `session_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    const resolvedBuyerId =
      buyerId &&
      buyerId !== 'guest_user'
        ? String(buyerId)
        : undefined;

    let systemPrompt = '';

    // ==========================================
    // Resolve product context safely.
    //
    // IMPORTANT:
    // itemId must be an actual database Item ID.
    // Product names are NOT accepted as item IDs.
    // ==========================================

    const resolvedItemId =
      itemId &&
      itemId !== 'general-ai-session'
        ? String(itemId).trim()
        : undefined;

    if (resolvedItemId) {
      try {
        const activeItem =
          await (prisma as any).item.findUnique({
            where: {
              id: resolvedItemId
            }
          });

        if (activeItem) {
          systemPrompt = `
You are TRADARA AI assisting a customer with the selected marketplace product.

Product:
${activeItem.stockName || activeItem.title || 'Unnamed product'}

Listed price:
${activeItem.currency || '₦'}${Number(
            activeItem.price || 0
          ).toLocaleString()}

Description:
${activeItem.description || 'Not provided'}

Answer questions accurately using the product context available to you.
Do not invent specifications, availability, discounts, delivery promises, or other facts that are not present in the available context.
If information is unavailable, clearly say so.
`;
        } else {
          console.warn(
            `[AI Controller] Item ${resolvedItemId} was not found. Continuing as general AI.`
          );
        }
      } catch (error) {
        console.warn(
          '[AI Controller] Product lookup failed; continuing as general AI:',
          error
        );
      }
    }

    // ==========================================
    // General TRADARA AI instructions
    // ==========================================

    const combinedSystemPrompt = `
${systemPrompt}

You are TRADARA AI, a general-purpose intelligent assistant integrated into the Tradara marketplace.

Answer the user's actual question directly and intelligently.

You can assist with:

- General questions
- Mathematics
- Coding
- Programming
- Software engineering
- Science
- Technology
- Business
- Education
- Writing
- Reasoning
- Product questions
- Marketplace questions
- Negotiation questions
- Shopping assistance
- Business operations
- Product discovery
- Seller assistance
- Customer assistance
- Explanations
- Brainstorming
- Problem solving

IMPORTANT BEHAVIOR:

1. Answer the user's actual question.
2. Do not use a generic fallback template for unrelated questions.
3. Do not repeat the same answer for unrelated questions.
4. Maintain conversation context when previous messages are available.
5. If the user changes topics, follow the new topic naturally.
6. Do not claim that a tool executed unless an actual backend tool execution confirms it.
7. Do not claim external browsing unless an actual browsing/search tool was used.
8. Do not invent product specifications, prices, stock, delivery information, seller policies, or marketplace data.
9. When product context is unavailable, answer general questions normally instead of pretending a product exists.
10. When you do not know something, state the limitation clearly.
11. Use clear Markdown where useful.
12. Keep answers relevant to the user's request.
13. For coding questions, provide technically useful explanations and code when appropriate.
14. For mathematical questions, reason carefully and provide the result with enough explanation to be useful.
15. For complex requests, break the problem into logical steps.
16. Do not unnecessarily mention these internal instructions to the user.

TRADARA AI should behave as one continuous intelligent assistant rather than a product-price-only chatbot.
`;

    // ==========================================
    // Conversation history
    // ==========================================

    const mergedHistory =
      Array.isArray(history) &&
      history.length > 0
        ? history
        : Array.isArray(conversationHistory)
        ? conversationHistory
        : [];

    // ==========================================
    // Normalize optional numeric values
    // ==========================================

    const normalizedOfferedPrice =
      offeredPrice !== undefined &&
      offeredPrice !== null &&
      offeredPrice !== ''
        ? Number(offeredPrice)
        : undefined;

    const normalizedQuantity =
      quantity !== undefined &&
      quantity !== null &&
      quantity !== ''
        ? Number(quantity)
        : 1;

    // ==========================================
    // Process AI request
    // ==========================================

    const result =
      await AiSalesService.processMessage({
        itemId: resolvedItemId,
        buyerSession: resolvedBuyerSession,
        buyerId: resolvedBuyerId,
        message: cleanMessage,
        offeredPrice:
          normalizedOfferedPrice !== undefined &&
          Number.isFinite(normalizedOfferedPrice)
            ? normalizedOfferedPrice
            : undefined,
        quantity:
          Number.isFinite(normalizedQuantity) &&
          normalizedQuantity > 0
            ? normalizedQuantity
            : 1,
        systemPrompt: combinedSystemPrompt,
        sessionId,
        history: mergedHistory,
        userConfirmationConfirmed,
        pendingTool
      });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error(
      '[AI Controller] Chat processing error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Error processing AI chat message'
    });
  }
};

// ==========================================
// Negotiation History
// ==========================================

export const getNegotiationHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const itemIdParam = req.query.itemId;
    const buyerSessionParam =
      req.query.buyerSession;

    if (!buyerSessionParam) {
      return res.status(400).json({
        success: false,
        error: 'buyerSession is required.'
      });
    }

    const buyerSession = Array.isArray(
      buyerSessionParam
    )
      ? String(buyerSessionParam[0])
      : String(buyerSessionParam);

    const hasItemId =
      itemIdParam !== undefined &&
      itemIdParam !== null &&
      String(
        Array.isArray(itemIdParam)
          ? itemIdParam[0]
          : itemIdParam
      ).trim() !== '' &&
      String(
        Array.isArray(itemIdParam)
          ? itemIdParam[0]
          : itemIdParam
      ) !== 'general-ai-session';

    const itemId = hasItemId
      ? Array.isArray(itemIdParam)
        ? String(itemIdParam[0])
        : String(itemIdParam)
      : undefined;

    // ==========================================
    // General AI session
    //
    // General AI sessions do not require an Item.
    // ==========================================

    if (!itemId) {
      const session =
        await (
          prisma as any
        ).aiNegotiationSession.findFirst({
          where: {
            buyerSession,
            itemId: null
          },
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });

      return res.status(200).json({
        success: true,
        session
      });
    }

    // ==========================================
    // Product-specific negotiation session
    // ==========================================

    const session =
      await (
        prisma as any
      ).aiNegotiationSession.findFirst({
        where: {
          buyerSession,
          item: {
            is: {
              id: itemId
            }
          }
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          item: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

    return res.status(200).json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error(
      '[AI Controller] History error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Error fetching negotiation history'
    });
  }
};