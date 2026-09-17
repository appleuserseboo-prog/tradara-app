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
    // itemId must be an actual database item ID.
    // Product names are NOT accepted as item IDs.
    // ==========================================

    if (
      itemId &&
      itemId !== 'general-ai-session'
    ) {
      try {
        const activeItem =
          await (prisma as any).item.findUnique({
            where: { id: String(itemId) }
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
Do not invent specifications or promises.
`;
        }
      } catch (error) {
        console.warn(
          '[AI Controller] Product lookup failed; continuing as general AI:',
          error
        );
      }
    }

    // ==========================================
    // Preserve explicit confirmation information
    // ==========================================

    const combinedSystemPrompt = `
${systemPrompt}

You are TRADARA AI, a general-purpose intelligent assistant.

Answer the user's actual question directly.

You can answer:
- General questions
- Mathematics
- Coding
- Programming
- Science
- Technology
- Business
- Education
- Writing
- Reasoning
- Product questions
- Marketplace questions
- Negotiation questions

Do not use a generic fallback template.
Do not repeat the same answer for unrelated questions.
Do not claim that a tool executed unless an actual backend tool execution confirms it.
Do not claim external browsing unless an actual browsing tool was used.
Maintain conversation context.
Use clear Markdown where useful.
`;

    const mergedHistory =
      Array.isArray(history) &&
      history.length > 0
        ? history
        : Array.isArray(conversationHistory)
        ? conversationHistory
        : [];

    const result =
      await AiSalesService.processMessage({
        itemId:
          itemId &&
          itemId !== 'general-ai-session'
            ? String(itemId)
            : undefined,
        buyerSession: resolvedBuyerSession,
        buyerId: resolvedBuyerId,
        message: cleanMessage,
        offeredPrice:
          offeredPrice !== undefined &&
          offeredPrice !== null &&
          offeredPrice !== ''
            ? Number(offeredPrice)
            : undefined,
        quantity:
          quantity !== undefined &&
          quantity !== null &&
          quantity !== ''
            ? Number(quantity)
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

    if (!itemIdParam || !buyerSessionParam) {
      return res.status(400).json({
        success: false,
        error:
          'itemId and buyerSession are required.'
      });
    }

    const itemId = Array.isArray(itemIdParam)
      ? String(itemIdParam[0])
      : String(itemIdParam);

    const buyerSession = Array.isArray(
      buyerSessionParam
    )
      ? String(buyerSessionParam[0])
      : String(buyerSessionParam);

    const session =
      await (
        prisma as any
      ).aiNegotiationSession.findFirst({
        where: {
          itemId,
          buyerSession
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
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