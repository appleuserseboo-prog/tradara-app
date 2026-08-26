import type { ToolExecutionPayload, ToolExecutionResult, ToolDefinitionSchema } from '../types/ai';

export interface SendChatMessagePayload {
  itemId: string;
  buyerSession: string;
  buyerId?: string;
  message: string;
  offeredPrice?: number;
  quantity?: number;
}

export interface SendChatMessageResponse {
  success: boolean;
  data?: {
    reply: string;
    status?: string;
    agreedPrice?: number;
    perception?: any;
    intelligence?: any;
  };
  error?: string;
}

export interface GetNegotiationHistoryResponse {
  success: boolean;
  session?: {
    status?: string;
    agreedPrice?: number;
    messages: Array<{
      id?: string;
      sender: string;
      message: string;
      createdAt?: string;
      offerMade?: number;
    }>;
  };
  error?: string;
}

class AiApiService {
  private baseUrl = '/api/ai';

  /**
   * Execute an automated tool payload
   */
  async executeTool(payload: ToolExecutionPayload): Promise<ToolExecutionResult<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/execute-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error executing tool via AI Service:', error);
      return {
        success: false,
        message: error.message || 'Failed to execute tool',
        result: null,
      };
    }
  }

  /**
   * Retrieve list of available AI schema tools
   */
  async getAvailableTools(): Promise<ToolDefinitionSchema[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching available tools:', error);
      return [];
    }
  }

  /**
   * Send chat message during live negotiation session
   */
  async sendChatMessage(payload: SendChatMessagePayload): Promise<SendChatMessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/negotiation/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send chat message',
      };
    }
  }

  /**
   * Fetch previous negotiation chat history for a session
   */
  async getNegotiationHistory(itemId: string, buyerSession: string): Promise<GetNegotiationHistoryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/negotiation/history?itemId=${encodeURIComponent(itemId)}&buyerSession=${encodeURIComponent(buyerSession)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error retrieving negotiation history:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch history',
      };
    }
  }
}

export const aiApiService = new AiApiService();