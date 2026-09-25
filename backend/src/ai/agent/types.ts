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

export type AgentToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AgentToolCategory =
  | 'context'
  | 'marketplace'
  | 'research'
  | 'web'
  | 'file'
  | 'media'
  | 'developer'
  | 'marketing'
  | 'finance'
  | 'security'
  | 'communication'
  | 'automation'
  | 'system'
  | 'other';

export type AgentMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AgentMessage {
  role: AgentMessageRole;
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
  permissions?: string[];
  storeId?: string;
  preferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentProjectContext {
  projectId?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AgentMemoryEntry {
  key: string;
  value: string;
  category?: string;
  source?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface AgentArtifact {
  id?: string;
  name: string;
  mimeType: string;
  url?: string;
  path?: string;
  size?: number;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  conversationId?: string;
  taskId?: string;
  requestId?: string;
  user?: AgentUserContext;
  product?: AgentProductContext;
  project?: AgentProjectContext;

  messages?: AgentMessage[];
  attachments?: AgentAttachment[];
  memory?: AgentMemoryEntry[];
  artifacts?: AgentArtifact[];

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
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentPlan {
  goal: string;
  intent: TradaraIntent;
  agent: TradaraAgentType;
  steps: AgentPlanStep[];
  requiresApproval?: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  requestedAt?: string;
  riskLevel?: AgentToolRiskLevel;
  requiresApproval?: boolean;
  metadata?: Record<string, any>;
}

export interface AgentToolResult {
  callId: string;
  name: string;
  success: boolean;
  result?: any;
  error?: string;
  durationMs?: number;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface AgentVerification {
  verified: boolean;
  confidence: number;
  warnings: string[];
  sources?: Array<{
    title?: string;
    url?: string;
    type?: string;
    retrievedAt?: string;
    metadata?: Record<string, any>;
  }>;
  checks?: Array<{
    name: string;
    passed: boolean;
    details?: string;
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

  artifacts?: AgentArtifact[];

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

export interface AgentToolParameterSchema {
  type: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  properties?: Record<string, AgentToolParameterSchema>;
  items?: AgentToolParameterSchema;
  additionalProperties?: boolean;
}

export interface AgentToolParameters {
  type: 'object';
  properties: Record<string, AgentToolParameterSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface AgentToolDefinition {
  name: string;

  description: string;

  riskLevel: AgentToolRiskLevel;

  requiresApproval?: boolean;

  category?: AgentToolCategory;
  tags?: string[];
  parameters?: AgentToolParameters;
  returns?: AgentToolParameterSchema;
  supportsParallel?: boolean;
  timeoutMs?: number;
  enabled?: boolean;
  metadata?: Record<string, any>;

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
  allowParallelTools?: boolean;
  toolTimeoutMs?: number;
  maxHistoryMessages?: number;
}
