// ==========================================
// FILE: backend/src/ai/rag/documentProcessor.ts
// ==========================================

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: {
    source: string;
    category?: string;
    storeId?: string;
    createdAt: string;
  };
}

export interface IngestDocumentPayload {
  documentId: string;
  title: string;
  content: string;
  source: string;
  category?: string;
  storeId?: string;
}

export class DocumentProcessor {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(chunkSize = 500, chunkOverlap = 100) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Splits raw text content into overlapping semantic chunks for vector embedding.
   */
  public processDocument(payload: IngestDocumentPayload): DocumentChunk[] {
    const { documentId, content, source, category, storeId } = payload;
    const cleanedText = this.cleanText(content);
    const textSegments = this.splitIntoParagraphs(cleanedText);

    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const segment of textSegments) {
      if ((currentChunk + ' ' + segment).length > this.chunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push({
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            content: currentChunk.trim(),
            chunkIndex,
            metadata: {
              source,
              category,
              storeId,
              createdAt: new Date().toISOString(),
            },
          });
          chunkIndex++;
        }

        // Apply overlap from the tail end of the previous chunk
        const overlapStart = Math.max(0, currentChunk.length - this.chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart) + ' ' + segment;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${segment}` : segment;
      }
    }

    // Flush remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        content: currentChunk.trim(),
        chunkIndex,
        metadata: {
          source,
          category,
          storeId,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return chunks;
  }

  /**
   * Sanitizes text content by removing redundant whitespace and control characters.
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Splits text on sentence/paragraph boundaries to preserve context structure.
   */
  private splitIntoParagraphs(text: string): string[] {
    return text.split(/(?<=\.|\?|\!)\s+|\n\n+/).filter((s) => s.trim().length > 0);
  }
}