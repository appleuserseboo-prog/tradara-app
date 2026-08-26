export interface ToolExecutionPayload {
  toolName: string;
  parameters: Record<string, any>;
  confirmed?: boolean;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  message?: string;
  result?: T;
  error?: string;
}

export interface ToolDefinitionSchema {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface PendingToolApproval {
  toolName: string;
  parameters: Record<string, any>;
  riskLevel: 'READ_ONLY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXECUTE';
}

export interface ToolCallItem {
  toolName: string;
  parameters: Record<string, any>;
  result?: ToolExecutionResult;
  status: 'pending' | 'completed' | 'failed';
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agreedPrice?: number;
  status?: string;
  toolCalls?: ToolCallItem[];
}