// ==========================================
// FILE: backend/src/ai/memory/MemoryService.ts
// ==========================================

import { PrismaClient } from '@prisma/client';
import { GeminiModelAdapter } from '../models/GeminiModelAdapter';

const prisma = new PrismaClient();

export interface UserFact {
  category: 'preference' | 'budget' | 'project' | 'habit' | 'negotiation_style';
  key: string;
  value: string;
  weight?: number;
}

export class MemoryService {
  private aiAdapter: GeminiModelAdapter;

  constructor(apiKey: string) {
    this.aiAdapter = new GeminiModelAdapter(apiKey, 'gemini-2.5-flash');
  }

  /**
   * Retrieves long-term memories relevant to the user for context injection.
   */
  async getRelevantMemories(userId: string, limit = 10): Promise<string[]> {
    try {
      const memories = await prisma.userAiMemory.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return memories.map(m => `[Memory - ${m.category.toUpperCase()}]: ${m.key} = ${m.value}`);
    } catch (error) {
      console.error('Error fetching user memories:', error);
      return [];
    }
  }

  /**
   * Asynchronously extracts facts from recent dialogue and persists them in MongoDB.
   */
  async extractAndStoreMemories(userId: string, userMessage: string, aiResponse: string): Promise<void> {
    try {
      const prompt = `
Extract persistent user facts, preferences, budgets, or business goals from this conversation turn.
Do NOT extract transient greetings or one-off questions.

User: "${userMessage}"
AI: "${aiResponse}"

Return ONLY a valid JSON array of objects with the following shape:
[
  {
    "category": "preference" | "budget" | "project" | "habit" | "negotiation_style",
    "key": "short_descriptive_key",
    "value": "extracted fact value"
  }
]
If no durable facts exist, return [].
`;

      const response = await this.aiAdapter.generate({
        prompt,
        temperature: 0.1,
      });

      const cleanJsonText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      if (!cleanJsonText || cleanJsonText === '[]') return;

      const extractedFacts: UserFact[] = JSON.parse(cleanJsonText);

      for (const fact of extractedFacts) {
        if (!fact.key || !fact.value) continue;

        await prisma.userAiMemory.upsert({
          where: {
            // Assumes a composite index on userId_key in your Prisma schema
            id: `${userId}_${fact.key.toLowerCase().replace(/\s+/g, '_')}`,
          },
          update: {
            value: fact.value,
            category: fact.category,
            updatedAt: new Date(),
          },
          create: {
            id: `${userId}_${fact.key.toLowerCase().replace(/\s+/g, '_')}`,
            userId,
            category: fact.category,
            key: fact.key,
            value: fact.value,
            weight: fact.weight ?? 1.0,
          },
        });
      }
    } catch (error) {
      // Non-blocking background log
      console.warn('Memory extraction skipped or non-critical error:', error);
    }
  }
}