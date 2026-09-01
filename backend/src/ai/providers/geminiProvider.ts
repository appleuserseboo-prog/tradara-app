
import { IAiProvider, AiChatMessagePayload, AiProviderCompletionOptions, AiProviderResponse, ToolCallRequest } from './aiProvider.interface';
import { SecurityContext, ToolExecutionResult } from '../tools/types';
import { toolRegistry } from '../tools/ToolRegistry';

export class GeminiProvider implements IAiProvider {
  public readonly name = 'gemini';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  public async generateCompletion(
    messages: AiChatMessagePayload[],
    options: AiProviderCompletionOptions = {}
  ): Promise<AiProviderResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }

    const model = options.model || process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    const payload: any = {
      contents
    };

    if (options.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }

    const generationConfig: any = {};
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }

    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    if (options.tools && options.tools.length > 0) {
      const functionDeclarations = options.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      payload.tools = [
        {
          functionDeclarations
        }
      ];
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls: ToolCallRequest[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
    }

    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      promptTokens,
      completionTokens,
      rawResponse: data
    };
  }

  public async executeToolCall(
    toolCall: ToolCallRequest,
    context: SecurityContext,
    userConfirmationConfirmed: boolean = false
  ): Promise<ToolExecutionResult> {
    return await toolRegistry.executeTool(
      toolCall.name,
      toolCall.args,
      context,
      userConfirmationConfirmed
    );
  }
}