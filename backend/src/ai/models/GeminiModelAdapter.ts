// backend/src/ai/models/GeminiModelAdapter.ts

import { GoogleGenAI } from '@google/genai';
import { AIModel, AIRequest, AIResponse } from '../interfaces/AIModel';

export class GeminiModelAdapter implements AIModel {
  private ai: GoogleGenAI;
  private defaultModelName: string;

  constructor(apiKey: string, defaultModel = 'gemini-2.5-flash') {
    this.ai = new GoogleGenAI({ apiKey });
    this.defaultModelName = defaultModel;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const model = request.systemInstruction
      ? this.defaultModelName
      : this.defaultModelName;

    const response = await this.ai.models.generateContent({
      model,
      contents: request.prompt,
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature ?? 0.3,
        maxOutputTokens: request.maxTokens ?? 1000,
      },
    });

    return {
      text: response.text || '',
    };
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const responseStream = await this.ai.models.generateContentStream({
      model: this.defaultModelName,
      contents: request.prompt,
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature ?? 0.3,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }
}