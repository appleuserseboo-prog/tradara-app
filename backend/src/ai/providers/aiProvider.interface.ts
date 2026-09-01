// ==========================================
// FILE: backend/src/ai/providers/aiProvider.interface.ts
// ==========================================

import { SecurityContext, ToolExecutionResult, ToolDefinition } from '../tools/types';

export interface AiChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiProviderCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  systemInstruction?: string;
}

export interface ToolCallRequest {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface AiProviderResponse {
  content: string;
  toolCalls?: ToolCallRequest[];
  promptTokens?: number;
  completionTokens?: number;
  rawResponse?: any;
}

export interface IAiProvider {
  /**
   * Unique identifier for the provider implementation (e.g. 'openai', 'gemini')
   */
  readonly name: string;

  /**
   * Generates a completion or conversation response given messages and optional tools.
   */
  generateCompletion(
    messages: AiChatMessagePayload[],
    options?: AiProviderCompletionOptions
  ): Promise<AiProviderResponse>;

  /**
   * Executes tool-calling flow or helper logic if handled internally by the provider.
   */
  executeToolCall?(
    toolCall: ToolCallRequest,
    context: SecurityContext,
    userConfirmationConfirmed?: boolean
  ): Promise<ToolExecutionResult>;
}