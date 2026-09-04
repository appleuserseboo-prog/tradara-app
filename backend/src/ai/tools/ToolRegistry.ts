// ==========================================
// FILE: backend/src/ai/tools/toolRegistry.ts
// ==========================================

import { ToolDefinition, RegisteredToolMap, SecurityContext, ToolExecutionResult } from './types';
import { productTools } from './productTools';
import { orderTools } from './orderTools';
import { analyticsTools } from './analyticsTools';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: RegisteredToolMap = {};

  private constructor() {
    this.registerDefaultTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerDefaultTools(): void {
    const defaultTools: ToolDefinition[] = [
      ...productTools,
      ...orderTools,
      ...analyticsTools
    ];

    for (const tool of defaultTools) {
      this.registerTool(tool);
    }
  }

  public registerTool(tool: ToolDefinition): void {
    if (this.tools[tool.name]) {
      console.warn(`[ToolRegistry] Warning: Tool '${tool.name}' is being overwritten.`);
    }
    this.tools[tool.name] = tool;
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools[name];
  }

  public getAllTools(): ToolDefinition[] {
    return Object.values(this.tools);
  }

  public getAllDefinitions() {
    return Object.values(this.tools).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  public getToolsForRole(role: string): ToolDefinition[] {
    return Object.values(this.tools).filter((tool) =>
      tool.allowedRoles ? tool.allowedRoles.includes(role as any) : true
    );
  }

  public async executeTool(
    toolName: string,
    params: any,
    context: SecurityContext,
    userConfirmationConfirmed: boolean = false
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' is not registered in ToolRegistry.`,
        riskLevel: 'READ'
      };
    }

    if (tool.allowedRoles && !tool.allowedRoles.includes(context.role)) {
      return {
        success: false,
        error: `Access Denied: Role '${context.role}' does not have permission to execute tool '${toolName}'.`,
        riskLevel: tool.riskLevel || 'READ'
      };
    }

    if (tool.riskLevel === 'EXECUTE' && !userConfirmationConfirmed) {
      return {
        success: false,
        riskLevel: 'EXECUTE',
        requiresApproval: true,
        error: `High-risk tool '${toolName}' requires explicit human approval before execution.`,
        metadata: {
          pendingToolName: toolName,
          pendingParams: params
        }
      };
    }

    try {
      if (typeof tool.handler === 'function') {
        return await tool.handler(params, context);
      } else if (typeof tool.execute === 'function') {
        const data = await tool.execute(params, context);
        return {
          success: true,
          data,
          riskLevel: tool.riskLevel || 'READ'
        };
      } else {
        throw new Error(`Tool '${toolName}' missing execution implementation.`);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || `An error occurred while executing tool '${toolName}'.`,
        riskLevel: tool.riskLevel || 'READ'
      };
    }
  }
}

export const toolRegistry = ToolRegistry.getInstance();