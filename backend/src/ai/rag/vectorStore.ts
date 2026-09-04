// ==========================================
// FILE: backend/src/ai/rag/vectorStore.ts
// ==========================================

import { GoogleGenAI } from '@google/genai';
import { DocumentChunk } from './documentProcessor';

export interface VectorRecord {
  chunk: DocumentChunk;
  embedding: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export class VectorStore {
  private ai: GoogleGenAI;
  private embeddingModel = 'text-embedding-004';
  private storage: Map<string, VectorRecord> = new Map();

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
  }

  /**
   * Generates a dense vector embedding using the Gemini API.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response: any = await this.ai.models.embedContent({
        model: this.embeddingModel,
        contents: text,
      });

      const values = response.embedding?.values || response.embeddings?.[0]?.values;
      if (!values) {
        throw new Error('Failed to extract embedding values from Gemini API.');
      }

      return values;
    } catch (error) {
      console.error('VectorStore Embedding Error:', error);
      throw error;
    }
  }

  /**
   * Ingests a list of document chunks, embeds them, and persists them to the vector store.
   */
  public async addChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk.content);
      this.storage.set(chunk.id, {
        chunk,
        embedding,
      });
    }
  }

  /**
   * Queries the vector index using cosine similarity retrieval.
   */
  public async similaritySearch(
    query: string,
    topK = 3,
    filterStoreId?: string
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: SearchResult[] = [];

    for (const record of this.storage.values()) {
      if (filterStoreId && record.chunk.metadata.storeId !== filterStoreId) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, record.embedding);
      results.push({
        chunk: record.chunk,
        score: similarity,
      });
    }

    // Sort descending by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Calculates cosine similarity between two vector spaces.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}