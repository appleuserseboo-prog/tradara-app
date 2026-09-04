// ==========================================
// FILE: backend/src/ai/rag/knowledgeBaseService.ts
// ==========================================

import { VectorStore, SearchResult } from './vectorStore';
import { DocumentProcessor } from './documentProcessor';

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  private vectorStore: VectorStore;
  private documentProcessor: DocumentProcessor;
  private initialized = false;

  private constructor() {
    this.vectorStore = new VectorStore();
    this.documentProcessor = new DocumentProcessor(400, 80);
  }

  public static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  /**
   * Seeds default platform policies into the vector index if uninitialized.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const defaultDocs = [
      {
        documentId: 'doc_refund_policy',
        title: 'TRADARA Return and Refund Policy',
        source: 'Platform Policy Manual v2',
        category: 'Refunds',
        content: `TRADARA supports a 14-day hassle-free return window for eligible physical goods.
        Items must be unwashed, unused, and in original packaging with tags attached.
        Automated price negotiations finalized through TRADARA's AI agent are subject to final seller approval before payout release.
        Defective or non-matching goods qualify for direct store credit or full electronic refund upon verification.`,
      },
      {
        documentId: 'doc_shipping_guide',
        title: 'Global Delivery & Logistics Guide',
        source: 'TRADARA Logistics Ops',
        category: 'Shipping',
        content: `Standard shipping takes between 3 to 5 business days nationwide.
        Express delivery option guarantees 24 to 48 hour delivery in major metropolitan hubs.
        Sellers are required to dispatch orders within 24 hours of price negotiation finalization.
        Tracking IDs are dispatched automatically via WhatsApp webhooks and system notifications.`,
      },
    ];

    for (const doc of defaultDocs) {
      const chunks = this.documentProcessor.processDocument(doc);
      await this.vectorStore.addChunks(chunks);
    }

    this.initialized = true;
  }

  /**
   * Performs semantic similarity search on stored chunks.
   */
  public async search(
    query: string,
    topK = 3,
    storeId?: string
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.vectorStore.similaritySearch(query, topK, storeId);
  }
}

export const knowledgeBaseService = KnowledgeBaseService.getInstance();