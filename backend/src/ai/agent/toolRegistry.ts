// ==========================================
// FILE: backend/src/ai/agent/toolRegistry.ts
// TRADARA AI — Agent Tool Registry + Marketplace Tool Bridge
// ==========================================

import {
  AgentContext,
  AgentToolDefinition,
  AgentToolResult,
  AgentToolParameters,
} from './types';

import {
  toolRegistry as marketplaceToolRegistry,
} from '../tools/ToolRegistry';

import {
  RiskLevel,
  SecurityContext,
  UserRole,
} from '../tools/types';


// ==========================================
// INTERNAL REGISTRY
// ==========================================

const tools = new Map<string, AgentToolDefinition>();


// ==========================================
// INTERNAL HELPERS
// ==========================================

function createToolCallId(
  toolName: string
): string {
  return `tool_${toolName}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}


function normalizeRole(
  role: unknown
): UserRole {
  if (
    role === 'ADMIN' ||
    role === 'SELLER' ||
    role === 'BUYER' ||
    role === 'SUPPORT' ||
    role === 'GUEST'
  ) {
    return role;
  }

  return 'GUEST';
}


function buildSecurityContext(
  context: AgentContext
): SecurityContext {
  const user = context.user;

  const permissions = Array.isArray(
    (user as any)?.permissions
  )
    ? (user as any).permissions
    : [];

  const role = normalizeRole(
    user?.role
  );

  const metadata =
    context.metadata || {};

  const token =
    typeof metadata.authToken === 'string'
      ? metadata.authToken
      : undefined;

  const ipAddress =
    typeof metadata.ipAddress === 'string'
      ? metadata.ipAddress
      : undefined;

  return {
    userId:
      typeof user?.userId === 'string'
        ? user.userId
        : undefined,

    role,

    storeId:
      typeof (user as any)?.storeId === 'string'
        ? (user as any).storeId
        : undefined,

    permissions,

    token,

    ipAddress,
  };
}


// ==========================================
// LEGACY MARKETPLACE RISK → AGENT RISK
// ==========================================

function normalizeLegacyRisk(
  riskLevel: RiskLevel
): 'low' | 'medium' | 'high' | 'critical' {
  switch (riskLevel) {
    case 'READ':
      return 'low';

    case 'RECOMMEND':
      return 'medium';

    case 'PREPARE':
      return 'high';

    case 'EXECUTE':
      return 'critical';

    default:
      return 'low';
  }
}


function requiresLegacyApproval(
  riskLevel: RiskLevel
): boolean {
  return riskLevel === 'EXECUTE';
}

function normalizeLegacyParameters(
  parameters: any
): AgentToolParameters | undefined {
  if (!parameters || typeof parameters !== 'object') {
    return undefined;
  }

  const properties =
    parameters.properties &&
    typeof parameters.properties === 'object'
      ? parameters.properties
      : {};

  return {
    type: 'object',
    properties,
    ...(Array.isArray(parameters.required)
      ? { required: parameters.required }
      : {}),
    ...(typeof parameters.additionalProperties === 'boolean'
      ? { additionalProperties: parameters.additionalProperties }
      : {}),
  };
}


// ==========================================
// AGENT REGISTRY
// ==========================================

export function registerAgentTool(
  definition: AgentToolDefinition
): void {
  tools.set(
    definition.name,
    definition
  );
}


export function getAgentTool(
  name: string
): AgentToolDefinition | undefined {
  return tools.get(name);
}


export function listAgentTools(): AgentToolDefinition[] {
  return Array.from(
    tools.values()
  );
}


// ==========================================
// DIRECT AGENT TOOL EXECUTION
// ==========================================

export async function executeAgentTool(
  name: string,
  args: Record<string, any>,
  context: AgentContext,
  options: {
    executeActions?: boolean;
    approved?: boolean;
  } = {}
): Promise<AgentToolResult> {
  const startedAt = Date.now();

  const tool =
    getAgentTool(name);

  if (!tool) {
    return {
      callId: createToolCallId(name),
      name,
      success: false,
      error:
        `Tool "${name}" is not registered.`,
      durationMs:
        Date.now() - startedAt,
    };
  }

  // ========================================
  // APPROVAL GATE
  // ========================================

  if (
    tool.requiresApproval &&
    !options.approved &&
    options.executeActions !== false
  ) {
    return {
      callId: createToolCallId(name),
      name,
      success: false,
      error:
        `APPROVAL_REQUIRED:${JSON.stringify({
          toolName: name,
          params: args,
          reason:
            `The "${name}" operation requires explicit user approval.`,
        })}`,
      durationMs:
        Date.now() - startedAt,
    };
  }

  // ========================================
  // EXECUTE
  // ========================================

  try {
    const result =
      await tool.execute(
        args,
        context
      );

    return {
      callId: createToolCallId(name),
      name,
      success: true,
      result,
      durationMs:
        Date.now() - startedAt,
    };
  } catch (error: any) {
    return {
      callId: createToolCallId(name),
      name,
      success: false,
      error:
        error?.message ||
        'Tool execution failed.',
      durationMs:
        Date.now() - startedAt,
    };
  }
}


// ==========================================
// EXISTING MARKETPLACE TOOL BRIDGE
// ==========================================
//
// IMPORTANT:
//
// These tools are NOT copied.
//
// The mature registry at:
//
//   ../tools/toolRegistry.ts
//
// remains the source of truth for:
//
// - Products
// - Orders
// - Analytics
// - Roles
// - Permissions
// - Risk levels
// - Approval requirements
// - Actual execution handlers
//
// This adapter simply exposes those capabilities
// through the new agent runtime.
// ==========================================

function registerMarketplaceTools(): void {
  const marketplaceTools =
    marketplaceToolRegistry.getAllTools();

  for (
    const marketplaceTool
    of marketplaceTools
  ) {
    const {
      name,
      description,
      riskLevel,
      allowedRoles,
    } = marketplaceTool;

    registerAgentTool({
      name,

      description,

      parameters: normalizeLegacyParameters(
        (marketplaceTool as any).parameters
      ),

      category: 'marketplace',
      tags: ['marketplace', 'legacy-registry'],
      supportsParallel: riskLevel !== 'EXECUTE',

      riskLevel:
        normalizeLegacyRisk(
          riskLevel
        ),

      requiresApproval:
        requiresLegacyApproval(
          riskLevel
        ),

      execute: async (
        args,
        context
      ) => {
        const securityContext =
          buildSecurityContext(
            context
          );

        const currentRole =
          securityContext.role;

        // ====================================
        // ROLE CHECK
        // ====================================

        if (
          allowedRoles &&
          allowedRoles.length > 0 &&
          !allowedRoles.includes(
            currentRole
          )
        ) {
          throw new Error(
            `Access denied: role "${currentRole}" cannot execute tool "${name}".`
          );
        }

        // ====================================
        // ACTION / APPROVAL STATE
        // ====================================

        const executeActions =
          context.metadata?.executeActions === true;

        const approved =
          context.metadata?.approved === true;

        // ====================================
        // EXECUTE THROUGH ORIGINAL REGISTRY
        // ====================================

        const result =
          await marketplaceToolRegistry.executeTool(
            name,
            args || {},
            securityContext,
            approved ||
              executeActions
          );

        // ====================================
        // APPROVAL REQUIRED
        // ====================================

        if (
          result.requiresApproval
        ) {
          throw new Error(
            `APPROVAL_REQUIRED:${JSON.stringify({
              toolName:
                result.metadata
                  ?.pendingToolName ||
                name,

              params:
                result.metadata
                  ?.pendingParams ||
                args ||
                {},

              reason:
                result.error ||
                `The "${name}" operation requires explicit user approval.`,
            })}`
          );
        }

        // ====================================
        // TOOL FAILURE
        // ====================================

        if (!result.success) {
          throw new Error(
            result.error ||
              `Marketplace tool "${name}" failed.`
          );
        }

        // ====================================
        // NORMALIZED AGENT RESULT
        // ====================================

        return {
          source:
            'marketplace-tool-registry',

          toolName:
            name,

          riskLevel,

          success: true,

          data:
            result.data,

          metadata:
            result.metadata || {},
        };
      },
    });
  }
}


// ==========================================
// NATIVE CONTEXT TOOLS
// ==========================================
//
// These remain separate from marketplace tools
// because they operate on the agent request context
// rather than the marketplace database.
// ==========================================


// ==========================================
// ACTIVE PRODUCT CONTEXT
// ==========================================

registerAgentTool({
  name: 'get_active_product_context',

  description:
    'Returns the currently selected product context when a product is active.',

  riskLevel: 'low',
  category: 'context',
  supportsParallel: true,
  parameters: { type: 'object', properties: {} },

  execute: async (
    _args,
    context
  ) => {
    if (!context.product) {
      return {
        available: false,

        message:
          'No active product context is available.',
      };
    }

    return {
      available: true,

      product:
        context.product,
    };
  },
});


// ==========================================
// USER CONTEXT
// ==========================================

registerAgentTool({
  name: 'get_user_context',

  description:
    'Returns the current authenticated user context available to the AI runtime.',

  riskLevel: 'low',
  category: 'context',
  supportsParallel: true,
  parameters: { type: 'object', properties: {} },

  execute: async (
    _args,
    context
  ) => {
    return {
      available:
        Boolean(
          context.user?.userId
        ),

      user:
        context.user || null,
    };
  },
});


// ==========================================
// CURRENT REQUEST CONTEXT
// ==========================================

registerAgentTool({
  name: 'get_current_context',

  description:
    'Returns the structured context supplied to the current AI request.',

  riskLevel: 'low',
  category: 'context',
  supportsParallel: true,
  parameters: { type: 'object', properties: {} },

  execute: async (
    _args,
    context
  ) => {
    return {
      conversationId:
        context.conversationId,

      taskId:
        context.taskId,

      user:
        context.user || null,

      product:
        context.product || null,

      project:
        context.project || null,

      memory:
        context.memory || [],

      globalContext:
        context.globalContext || {},

      attachments:
        context.attachments || [],
    };
  },
});


// ==========================================
// INITIALIZE MARKETPLACE BRIDGE
// ==========================================
//
// This must happen after the native tools have
// been registered so the two systems coexist.
//
// Existing marketplace tools remain owned by the
// original ToolRegistry.
// ==========================================

registerMarketplaceTools();