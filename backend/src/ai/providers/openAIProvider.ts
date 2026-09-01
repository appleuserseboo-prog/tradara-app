
import { IAiProvider, AiChatMessagePayload, AiProviderCompletionOptions, AiProviderResponse, ToolCallRequest } from './aiProvider.interface';
import { SecurityContext, ToolExecutionResult } from '../tools/types';
import { toolRegistry } from '../tools/ToolRegistry';

export class OpenAIProvider implements IAiProvider {
  public readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  public async generateCompletion(
    messages: AiChatMessagePayload[],
    options: AiProviderCompletionOptions = {}
  ): Promise<AiProviderResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables.');
    }

    const model = options.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 1000;

    const formattedMessages: Array<{ role: string; content: string }> = [];

    if (options.systemInstruction) {
      formattedMessages.push({
        role: 'system',
        content: options.systemInstruction
      });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    const formattedTools = options.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const payload: any = {
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens
    };

    if (formattedTools && formattedTools.length > 0) {
      payload.tools = formattedTools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    let toolCalls: ToolCallRequest[] | undefined;

    if (message?.tool_calls && Array.isArray(message.tool_calls)) {
      toolCalls = message.tool_calls.map((tc: any) => {
        let args = {};
        try {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
        } catch (e) {
          console.error('[OpenAIProvider] Failed to parse tool call arguments:', e);
        }

        return {
          id: tc.id,
          name: tc.function.name,
          args
        };
      });
    }

    return {
      content: message?.content || '',
      toolCalls,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
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