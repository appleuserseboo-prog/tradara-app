export type RiskLevel = 'READ' | 'RECOMMEND' | 'PREPARE' | 'EXECUTE';

export interface PendingToolApproval {
  toolName: string;
  riskLevel: RiskLevel;
  parameters: Record<string, any>;
  approvalToken?: string;
}

export interface ToolExecutionPayload {
  toolName: string;
  parameters?: Record<string, any>;
  confirmed?: boolean;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  riskLevel?: RiskLevel;
  requiresApproval?: boolean;
  approvalToken?: string;
  metadata?: Record<string, any>;
}

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterSchema>;
  required?: string[];
}

export interface ToolDefinitionSchema {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  parameters: ToolParameters;
}

export interface AIToolCall {
  toolName: string;
  parameters: Record<string, any>;
  result?: ToolExecutionResult;
  status: 'pending' | 'completed' | 'failed';
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: AIToolCall[];
}