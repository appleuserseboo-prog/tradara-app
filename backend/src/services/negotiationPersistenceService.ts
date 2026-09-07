// ==========================================
// FILE: src/services/negotiationPersistenceService.ts
// ==========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SaveOfferRoundInput {
  sessionId?: string;
  itemId?: string | null;
  buyerSession: string;
  buyerOffer?: number;
  buyerMessage: string;
  aiAction?: 'ACCEPT' | 'REJECT' | 'COUNTER' | 'GENERAL';
  aiCounterAmount?: number;
  aiReasoning?: string;
  aiBuyerMessage: string;
  currentRound: number;
}

/**
 * Persists an incoming offer and the resulting AI decision or general AI answer using your existing
 * AiNegotiationSession and AiChatMessage models in MongoDB via Prisma.
 */
export async function saveNegotiationRound(input: SaveOfferRoundInput) {
  const {
    sessionId,
    itemId,
    buyerSession,
    buyerOffer,
    buyerMessage,
    aiAction = 'GENERAL',
    aiCounterAmount,
    aiReasoning,
    aiBuyerMessage,
    currentRound,
  } = input;

  const isGeneral = aiAction === 'GENERAL' || !itemId || itemId === 'general-ai-session';
  const dbItemId = isGeneral ? null : itemId;

  const sessionStatus =
    aiAction === 'ACCEPT'
      ? 'accepted'
      : aiAction === 'REJECT'
      ? 'rejected'
      : 'active';

  // 1. Find or create the AiNegotiationSession record
  let session;
  if (sessionId && sessionId.length === 24) {
    session = await prisma.aiNegotiationSession.upsert({
      where: { id: sessionId },
      create: {
        itemId: dbItemId,
        buyerSession,
        currentOffer: aiCounterAmount || null,
        status: sessionStatus,
        roundCount: currentRound,
        agreedPrice: aiAction === 'ACCEPT' && aiCounterAmount ? aiCounterAmount : null,
      },
      update: {
        currentOffer: aiCounterAmount !== undefined ? aiCounterAmount : undefined,
        status: sessionStatus,
        roundCount: currentRound,
        agreedPrice: aiAction === 'ACCEPT' && aiCounterAmount ? aiCounterAmount : undefined,
      },
    });
  } else {
    session = await prisma.aiNegotiationSession.findFirst({
      where: { buyerSession, itemId: dbItemId, status: 'active' },
    });

    if (session) {
      session = await prisma.aiNegotiationSession.update({
        where: { id: session.id },
        data: {
          currentOffer: aiCounterAmount !== undefined ? aiCounterAmount : undefined,
          status: sessionStatus,
          roundCount: currentRound,
          agreedPrice: aiAction === 'ACCEPT' && aiCounterAmount ? aiCounterAmount : undefined,
        },
      });
    } else {
      session = await prisma.aiNegotiationSession.create({
        data: {
          itemId: dbItemId,
          buyerSession,
          currentOffer: aiCounterAmount || null,
          status: sessionStatus,
          roundCount: currentRound,
          agreedPrice: aiAction === 'ACCEPT' && aiCounterAmount ? aiCounterAmount : null,
        },
      });
    }
  }

  // 2. Log buyer message and AI response into AiChatMessage
  const buyerMsgRecord = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      sender: 'buyer',
      message: buyerMessage,
      offerMade: buyerOffer || null,
    },
  });

  const formattedAiMessage = aiReasoning 
    ? `${aiBuyerMessage}\n[Reasoning: ${aiReasoning}]`
    : aiBuyerMessage;

  const aiMsgRecord = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      sender: 'ai',
      message: formattedAiMessage,
      offerMade: aiCounterAmount || null,
    },
  });

  return { session, messages: [buyerMsgRecord, aiMsgRecord] };
}

/**
 * Retrieves past conversation history for a given session formatted for AI context injection.
 */
export async function getSessionHistory(sessionId: string) {
  return await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

export { prisma };