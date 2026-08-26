import type { Request } from 'express';

export type RiskLevel = 'READ' | 'RECOMMEND' | 'PREPARE' | 'EXECUTE';

export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER' | 'SUPPORT' | 'GUEST';

export interface SecurityContext {
  userId?: string;
  role: UserRole;
  storeId?: string;
  permissions: string[];
  token?: string;
  ipAddress?: string;
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

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  riskLevel: RiskLevel;
  requiresApproval?: boolean;
  approvalToken?: string;
  metadata?: Record<string, any>;
}

export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  allowedRoles: UserRole[];
  parameters: ToolParameters;
  handler: (params: TParams, context: SecurityContext) => Promise<ToolExecutionResult<TResult>>;
}

export interface RegisteredToolMap {
  [toolName: string]: ToolDefinition;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  storeId?: string;
  permissions?: string[];
  [key: string]: any;
}

export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: AuthenticatedUser;
}