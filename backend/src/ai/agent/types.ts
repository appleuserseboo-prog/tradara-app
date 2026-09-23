// ==========================================
// FILE: backend/src/ai/agent/types.ts
// TRADARA AI — Agent Runtime Core Types
// ==========================================

export type TradaraAgentType =
  | 'general'
  | 'marketplace'
  | 'research'
  | 'marketing'
  | 'developer'
  | 'finance'
  | 'security'
  | 'support'
  | 'vision'
  | 'media'
  | 'content'
  | 'file'
  | 'planning';

export type TradaraIntent =
  | 'general_question'
  | 'marketplace_search'
  | 'product_question'
  | 'product_comparison'
  | 'negotiation'
  | 'research'
  | 'web_access'
  | 'image_analysis'
  | 'video_analysis'
  | 'voice'
  | 'coding'
  | 'content_creation'
  | 'file_analysis'
  | 'business_analysis'
  | 'planning'
  | 'automation'
  | 'unknown';

export type AgentExecutionStatus =
  | 'queued'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting_approval';

export type AgentEventType =
  | 'start'
  | 'status'
  | 'plan'
  | 'tool_start'
  | 'tool_result'
  | 'content'
  | 'warning'
  | 'approval_required'
  | 'verification'
  | 'complete'
  | 'error';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface AgentAttachment {
  id?: string;
  name: string;
  mimeType: string;
  url?: string;
  data?: string;
  size?: number;
  type?: 'image' | 'video' | 'audio' | 'document' | 'code' | 'other';
  metadata?: Record<string, any>;
}

export interface AgentProductContext {
  itemId?: string;
  name?: string;
  price?: number;
  currency?: string;
  category?: string;
  description?: string;
  images?: string[];
  city?: string;
  area?: string;
  metadata?: Record<string, any>;
}

export interface AgentUserContext {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentProjectContext {
  projectId?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  conversationId?: string;
  taskId?: string;
  user?: AgentUserContext;
  product?: AgentProductContext;
  project?: AgentProjectContext;

  messages?: AgentMessage[];

  attachments?: AgentAttachment[];

  memory?: Array<{
    key: string;
    value: string;
    category?: string;
  }>;

  globalContext?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentRequest {
  message: string;

  conversationId?: string;
  sessionId?: string;
  taskId?: string;

  itemId?: string;
  buyerSession?: string;

  userId?: string;

  agent?: TradaraAgentType;
  intent?: TradaraIntent;

  context?: Partial<AgentContext>;

  attachments?: AgentAttachment[];

  stream?: boolean;

  executeActions?: boolean;

  approvedAction?: {
    toolName: string;
    params: Record<string, any>;
  };

  metadata?: Record<string, any>;
}

export interface AgentPlanStep {
  id: string;
  description: string;
  agent?: TradaraAgentType;
  tool?: string;
  status: AgentExecutionStatus;
  dependsOn?: string[];
  result?: any;
}

export interface AgentPlan {
  goal: string;
  intent: TradaraIntent;
  agent: TradaraAgentType;
  steps: AgentPlanStep[];
  requiresApproval?: boolean;
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface AgentToolResult {
  callId: string;
  name: string;
  success: boolean;
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface AgentVerification {
  verified: boolean;
  confidence: number;
  warnings: string[];
  sources?: Array<{
    title?: string;
    url?: string;
    type?: string;
  }>;
}

export interface AgentResponse {
  success: boolean;

  requestId: string;

  content: string;

  agent: TradaraAgentType;
  intent: TradaraIntent;

  status: AgentExecutionStatus;

  plan?: AgentPlan;

  toolCalls?: AgentToolCall[];
  toolResults?: AgentToolResult[];

  verification?: AgentVerification;

  requiresApproval?: boolean;

  pendingAction?: {
    toolName: string;
    params: Record<string, any>;
    reason: string;
  };

  metadata?: Record<string, any>;

  error?: string;
}

export interface AgentEvent {
  type: AgentEventType;

  requestId: string;

  timestamp: string;

  content?: string;

  status?: AgentExecutionStatus;

  agent?: TradaraAgentType;

  intent?: TradaraIntent;

  plan?: AgentPlan;

  toolCall?: AgentToolCall;

  toolResult?: AgentToolResult;

  verification?: AgentVerification;

  requiresApproval?: boolean;

  pendingAction?: {
    toolName: string;
    params: Record<string, any>;
    reason: string;
  };

  metadata?: Record<string, any>;

  error?: string;
}

export interface AgentToolDefinition {
  name: string;

  description: string;

  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  requiresApproval?: boolean;

  execute: (
    args: Record<string, any>,
    context: AgentContext
  ) => Promise<any>;
}

export interface AgentRuntimeOptions {
  maxSteps?: number;
  maxToolCalls?: number;
  enablePlanning?: boolean;
  enableVerification?: boolean;
  enableTools?: boolean;
  enableMemory?: boolean;
  executeActions?: boolean;
}