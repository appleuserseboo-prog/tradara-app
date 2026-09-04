// backend/src/ai/interfaces/AIModel.ts

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface AIResponse {
  text: string;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AIModel {
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
}