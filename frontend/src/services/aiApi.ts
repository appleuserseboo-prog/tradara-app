import type {
  ToolExecutionPayload,
  ToolExecutionResult,
  ToolDefinitionSchema,
  BuyerPerception,
  MarketplaceIntelligence
} from '../types/ai';

// Safely declare process for TypeScript static checking in browser/Vite environments
declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

export interface ChatHistoryItem {
  role: 'user' | 'model' | 'assistant';
  parts?: Array<{
    text: string;
  }>;
  content?: string;
  message?: string;
}

export interface SendChatMessagePayload {
  itemId?: string;
  buyerSession: string;
  buyerId?: string;
  message: string;
  offeredPrice?: number;
  quantity?: number;
  history?: ChatHistoryItem[];
  conversationHistory?: ChatHistoryItem[];
  sessionId?: string;
  userConfirmationConfirmed?: boolean;
  pendingTool?: any;
  product?: {
    id?: string;
    name?: string;
    listPrice?: number;
    currency?: string;
    category?: string;
    description?: string;
  };
}

export interface SendChatMessageResponse {
  success: boolean;
  data?: {
    reply?: string;
    response?: string;
    message?: string;
    content?: string;
    status?: string;
    sessionId?: string;
    agreedPrice?: number;
    perception?: BuyerPerception;
    intelligence?: MarketplaceIntelligence;
    requiresConfirmation?: boolean;
    pendingToolDetails?: any;
    toolExecutions?: any[];
  };
  error?: string;
}

export interface GetNegotiationHistoryResponse {
  success: boolean;
  session?: {
    id?: string;
    status?: string;
    agreedPrice?: number;
    messages: Array<{
      id?: string;
      sender: string;
      message?: string;
      content?: string;
      createdAt?: string;
      offerMade?: number;
    }>;
  };
  error?: string;
}

class AiApiService {
  private baseUrl = (() => {
    const envApiUrl =
      (typeof process !== 'undefined' &&
        process?.env?.REACT_APP_API_URL) ||
      (import.meta as any).env?.VITE_API_URL ||
      (import.meta as any).env?.REACT_APP_API_URL;

    return (
      envApiUrl
        ? `${envApiUrl}/api/ai`
        : '/api/ai'
    ).replace(/\/+$/, '');
  })();

  /**
   * Execute an automated tool payload.
   */
  async executeTool(
    payload: ToolExecutionPayload
  ): Promise<ToolExecutionResult<any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/execute-tool`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error(
        'Error executing tool via AI Service:',
        error
      );

      return {
        success: false,
        message:
          error.message ||
          'Failed to execute tool',
        result: null
      };
    }
  }

  /**
   * Retrieve list of available AI schema tools.
   */
  async getAvailableTools(): Promise<
    ToolDefinitionSchema[]
  > {
    try {
      const response = await fetch(
        `${this.baseUrl}/tools`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error(
        'Error fetching available tools:',
        error
      );

      return [];
    }
  }

  /**
   * Send general or product-aware AI chat.
   */
  async sendAiChat(
    payload: SendChatMessagePayload
  ): Promise<SendChatMessageResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            data?.error ||
            data?.message ||
            `HTTP error! status: ${response.status}`
        };
      }

      return data;
    } catch (error: any) {
      console.error(
        'Error sending Tradara AI chat:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Failed to send AI chat message'
      };
    }
  }

  /**
   * Send chat message during live negotiation session.
   *
   * Kept as a backwards-compatible API method.
   */
  async sendChatMessage(
    payload: SendChatMessagePayload
  ): Promise<SendChatMessageResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/negotiation/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            data?.error ||
            data?.message ||
            `HTTP error! status: ${response.status}`
        };
      }

      return data;
    } catch (error: any) {
      console.error(
        'Error sending chat message:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Failed to send chat message'
      };
    }
  }

  /**
   * Fetch previous negotiation chat history.
   */
  async getNegotiationHistory(
    itemId: string,
    buyerSession: string
  ): Promise<GetNegotiationHistoryResponse> {
    try {
      const query =
        `itemId=${encodeURIComponent(
          itemId
        )}&buyerSession=${encodeURIComponent(
          buyerSession
        )}`;

      const response = await fetch(
        `${this.baseUrl}/negotiation/history?${query}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            data?.error ||
            `HTTP error! status: ${response.status}`
        };
      }

      return data;
    } catch (error: any) {
      console.error(
        'Error retrieving negotiation history:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Failed to fetch history'
      };
    }
  }
}

export const aiApiService =
  new AiApiService();