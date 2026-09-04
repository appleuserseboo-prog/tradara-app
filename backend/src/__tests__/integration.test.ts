// ==========================================
// FILE: backend/src/__tests__/integration.test.ts
// ==========================================

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { knowledgeBaseService } from '../ai/rag/knowledgeBaseService';
import { knowledgeBaseTool } from '../ai/tools/ragTools';
import { webhookDispatcher } from '../services/webhookDispatcher';

// Mock Express App Setup for End-to-End Testing
const app: Express = express();
app.use(express.json());

// Mock Chat Endpoint simulating SSE output
app.post('/api/ai/chat/stream', (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream mock SSE chunks
  res.write(`data: ${JSON.stringify({ text: 'TRADARA AI: ' })}\n\n`);
  res.write(`data: ${JSON.stringify({ text: `Processing offer for: "${message}"` })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});

describe('TRADARA AI & Platform Integration Tests', () => {
  
  beforeAll(async () => {
    // Initialize Knowledge Base Vector Index
    await knowledgeBaseService.initialize();
  });

  describe('1. Server-Sent Events (SSE) Streaming Pipeline', () => {
    it('should reject requests missing a message payload', async () => {
      const response = await request(app)
        .post('/api/ai/chat/stream')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Message is required');
    });

    it('should correctly stream response chunks with text/event-stream headers', async () => {
      const response = await request(app)
        .post('/api/ai/chat/stream')
        .send({ message: 'I offer $150' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('TRADARA AI:');
      expect(response.text).toContain('[DONE]');
    });
  });

  describe('2. RAG Vector Store & Knowledge Base Tool', () => {
    it('should return relevant document chunks for refund queries', async () => {
      const results = await knowledgeBaseService.search('return refund window', 2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.chunk?.content?.toLowerCase()).toContain('return');
    });

    it('should execute knowledge_base_tool handler successfully', async () => {
      if (!knowledgeBaseTool.execute) {
        throw new Error('knowledgeBaseTool.execute handler is not defined');
      }

      const executionResult = await knowledgeBaseTool.execute(
        {
          query: 'shipping delivery time',
          topK: 1,
        },
        {} as any
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.data?.results?.length).toBe(1);
      expect(executionResult.data?.results?.[0]?.content).toContain('shipping');
    });

    it('should gracefully handle empty queries in tool execution', async () => {
      if (!knowledgeBaseTool.execute) {
        throw new Error('knowledgeBaseTool.execute handler is not defined');
      }

      const executionResult = await knowledgeBaseTool.execute(
        { query: '' },
        {} as any
      );

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBe('Search query parameter is required.');
    });
  });

  describe('3. Webhook Event Dispatcher', () => {
    it('should handle webhook delivery failures gracefully with retries', async () => {
      // Dispatch to non-existent endpoint to verify fail-safe error handling
      const result = await webhookDispatcher.dispatch(
        'http://localhost:9999/invalid-webhook-url',
        'negotiation.accepted',
        {
          sessionId: 'sess_test_123',
          storeId: 'store_xyz',
          productId: 'prod_456',
          agreedPrice: 180,
          currency: 'USD',
        },
        1 // 1 retry for fast testing
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});