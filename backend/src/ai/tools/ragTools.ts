// ==========================================
// FILE: backend/src/ai/tools/ragTools.ts
// ==========================================

import { ToolDefinition, SecurityContext, ToolExecutionResult, RiskLevel } from './types';
import { knowledgeBaseService } from '../rag/knowledgeBaseService';

const executeKnowledgeBaseSearch = async (
  params: any,
  _securityContext?: SecurityContext
): Promise<ToolExecutionResult> => {
  try {
    const query = String(params.query || '').trim();
    const topK = Number(params.topK || 3);
    const storeId = params.storeId ? String(params.storeId) : undefined;

    if (!query) {
      return {
        success: false,
        error: 'Search query parameter is required.',
        riskLevel: 'low' as RiskLevel,
      };
    }

    const searchResults = await knowledgeBaseService.search(query, topK, storeId);

    const formattedResults = searchResults.map((res) => ({
      score: res.score,
      source: res.chunk.metadata.source,
      category: res.chunk.metadata.category,
      content: res.chunk.content,
    }));

    return {
      success: true,
      data: {
        query,
        resultCount: formattedResults.length,
        results: formattedResults,
      },
      riskLevel: 'low' as RiskLevel,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to perform knowledge base search',
      riskLevel: 'low' as RiskLevel,
    };
  }
};

export const knowledgeBaseTool: ToolDefinition = {
  name: 'search_knowledge_base',
  description: 'Searches platform documentation, vendor return policies, shipping FAQs, and store guides using semantic vector similarity.',
  riskLevel: 'low' as RiskLevel,
  allowedRoles: ['GUEST', 'ADMIN', 'SELLER', 'BUYER'] as any,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search term or question to query the TRADARA knowledge base.',
      },
      topK: {
        type: 'number',
        description: 'Number of relevant context chunks to retrieve (default: 3).',
      },
      storeId: {
        type: 'string',
        description: 'Optional store filter to search specific vendor guidelines.',
      },
    },
    required: ['query'],
  },
  handler: executeKnowledgeBaseSearch,
  execute: executeKnowledgeBaseSearch,
};

export const ragTools: ToolDefinition[] = [knowledgeBaseTool];