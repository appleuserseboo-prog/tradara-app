// ==========================================
// FILE: backend/src/ai/agent/toolRegistry.ts
// TRADARA AI — Agent Tool Registry + Marketplace Tool Bridge
// PHASE 2 — DYNAMIC TOOL EXECUTION
// ==========================================

import {
  AgentContext,
  AgentToolDefinition,
  AgentToolResult,
  AgentToolParameters,
  AgentToolParameterSchema,
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
// RESERVED NATIVE TOOLS
// ==========================================
//
// Marketplace tools must never accidentally
// overwrite these runtime-owned capabilities.
// ==========================================

const RESERVED_NATIVE_TOOLS = new Set<string>([
  'get_active_product_context',
  'get_user_context',
  'get_current_context',
]);


// ==========================================
// INTERNAL HELPERS
// ==========================================

function createToolCallId(
  toolName: string
): string {
  return `tool_${toolName}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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
    ? (user as any).permissions.filter(
        (permission: unknown): permission is string =>
          typeof permission === 'string'
      )
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


// ==========================================
// SCHEMA NORMALIZATION
// ==========================================
//
// Legacy marketplace schemas are normalized
// into the agent runtime schema contract.
//
// This recursively handles:
// - objects
// - arrays
// - nested properties
// - enums
// - required fields
// - additionalProperties
// ==========================================

function normalizeParameterSchema(
  schema: any
): AgentToolParameterSchema {
  if (
    !schema ||
    typeof schema !== 'object'
  ) {
    return {
      type: 'string',
    };
  }

  const normalized: AgentToolParameterSchema = {
    type:
      typeof schema.type === 'string'
        ? schema.type.toLowerCase()
        : 'string',
  };

  if (
    typeof schema.description === 'string'
  ) {
    normalized.description =
      schema.description;
  }

  if (
    typeof schema.required === 'boolean'
  ) {
    normalized.required =
      schema.required;
  }

  if (
    Array.isArray(schema.enum)
  ) {
    normalized.enum =
      schema.enum.map(
        (value: unknown) =>
          String(value)
      );
  }

  if (
    schema.properties &&
    typeof schema.properties === 'object'
  ) {
    normalized.properties = {};

    for (
      const [key, value]
      of Object.entries(
        schema.properties
      )
    ) {
      normalized.properties[key] =
        normalizeParameterSchema(
          value
        );
    }
  }

  if (schema.items) {
    normalized.items =
      normalizeParameterSchema(
        schema.items
      );
  }

  if (
    typeof schema.additionalProperties === 'boolean'
  ) {
    normalized.additionalProperties =
      schema.additionalProperties;
  }

  return normalized;
}


function normalizeLegacyParameters(
  parameters: any
): AgentToolParameters | undefined {
  if (
    !parameters ||
    typeof parameters !== 'object'
  ) {
    return undefined;
  }

  const properties: Record<
    string,
    AgentToolParameterSchema
  > = {};

  if (
    parameters.properties &&
    typeof parameters.properties === 'object'
  ) {
    for (
      const [key, value]
      of Object.entries(
        parameters.properties
      )
    ) {
      properties[key] =
        normalizeParameterSchema(
          value
        );
    }
  }

  return {
    type: 'object',

    properties,

    ...(Array.isArray(
      parameters.required
    )
      ? {
          required:
            parameters.required.filter(
              (value: unknown): value is string =>
                typeof value === 'string'
            ),
        }
      : {}),

    ...(typeof parameters.additionalProperties === 'boolean'
      ? {
          additionalProperties:
            parameters.additionalProperties,
        }
      : {}),
  };
}


// ==========================================
// ARGUMENT NORMALIZATION
// ==========================================

function normalizeToolArguments(
  args: unknown
): Record<string, any> {
  if (
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args)
  ) {
    return {};
  }

  return {
    ...(args as Record<string, any>),
  };
}


// ==========================================
// BASIC RUNTIME ARGUMENT VALIDATION
// ==========================================
//
// This is intentionally lightweight.
//
// It prevents obviously malformed calls from
// reaching real database / marketplace handlers.
//
// Deep business validation remains owned by
// the actual marketplace tool.
// ==========================================

function validateParameterValue(
  value: any,
  schema: AgentToolParameterSchema,
  path: string
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    if (schema.required) {
      return `Missing required parameter "${path}".`;
    }

    return null;
  }

  const type =
    typeof schema.type === 'string'
      ? schema.type.toLowerCase()
      : 'string';

  switch (type) {
    case 'string':
      if (
        typeof value !== 'string'
      ) {
        return `Parameter "${path}" must be a string.`;
      }
      break;

    case 'number':
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
      ) {
        return `Parameter "${path}" must be a finite number.`;
      }
      break;

    case 'integer':
      if (
        typeof value !== 'number' ||
        !Number.isInteger(value)
      ) {
        return `Parameter "${path}" must be an integer.`;
      }
      break;

    case 'boolean':
      if (
        typeof value !== 'boolean'
      ) {
        return `Parameter "${path}" must be a boolean.`;
      }
      break;

    case 'array':
      if (
        !Array.isArray(value)
      ) {
        return `Parameter "${path}" must be an array.`;
      }

      if (schema.items) {
        for (
          let index = 0;
          index < value.length;
          index += 1
        ) {
          const error =
            validateParameterValue(
              value[index],
              schema.items,
              `${path}[${index}]`
            );

          if (error) {
            return error;
          }
        }
      }
      break;

    case 'object':
      if (
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        return `Parameter "${path}" must be an object.`;
      }

      if (schema.properties) {
        for (
          const [
            propertyName,
            propertySchema,
          ] of Object.entries(
            schema.properties
          )
        ) {
          const error =
            validateParameterValue(
              value[propertyName],
              propertySchema,
              `${path}.${propertyName}`
            );

          if (error) {
            return error;
          }
        }
      }
      break;

    default:
      break;
  }

  if (
    schema.enum &&
    schema.enum.length > 0 &&
    !schema.enum.includes(
      String(value)
    )
  ) {
    return `Parameter "${path}" must be one of: ${schema.enum.join(', ')}.`;
  }

  return null;
}


function validateToolArguments(
  tool: AgentToolDefinition,
  args: Record<string, any>
): string | null {
  if (!tool.parameters) {
    return null;
  }

  const schema =
    tool.parameters;

  if (
    !args ||
    typeof args !== 'object' ||
    Array.isArray(args)
  ) {
    return 'Tool arguments must be a JSON object.';
  }

  const required =
    Array.isArray(schema.required)
      ? schema.required
      : [];

  for (
    const requiredName
    of required
  ) {
    if (
      args[requiredName] === undefined ||
      args[requiredName] === null
    ) {
      return `Missing required parameter "${requiredName}".`;
    }
  }

  for (
    const [name, parameterSchema]
    of Object.entries(
      schema.properties || {}
    )
  ) {
    const error =
      validateParameterValue(
        args[name],
        parameterSchema,
        name
      );

    if (error) {
      return error;
    }
  }

  if (
    schema.additionalProperties === false
  ) {
    const knownKeys =
      new Set(
        Object.keys(
          schema.properties || {}
        )
      );

    for (
      const key
      of Object.keys(args)
    ) {
      if (
        !knownKeys.has(key)
      ) {
        return `Unknown parameter "${key}" is not allowed for tool "${tool.name}".`;
      }
    }
  }

  return null;
}


// ==========================================
// EXECUTION TIMEOUT
// ==========================================

async function executeWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  const safeTimeout =
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? timeoutMs
      : 30000;

  let timeoutHandle:
    ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise =
    new Promise<T>(
      (_, reject) => {
        timeoutHandle =
          setTimeout(() => {
            reject(
              new Error(
                `Tool "${toolName}" timed out after ${safeTimeout}ms.`
              )
            );
          }, safeTimeout);
      }
    );

  try {
    return await Promise.race([
      operation,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(
        timeoutHandle
      );
    }
  }
}


// ==========================================
// AGENT REGISTRY
// ==========================================

export function registerAgentTool(
  definition: AgentToolDefinition
): void {
  if (
    !definition ||
    typeof definition.name !== 'string' ||
    !definition.name.trim()
  ) {
    throw new Error(
      'Cannot register an agent tool without a valid name.'
    );
  }

  if (
    typeof definition.description !== 'string'
  ) {
    throw new Error(
      `Tool "${definition.name}" must have a description.`
    );
  }

  if (
    typeof definition.execute !== 'function'
  ) {
    throw new Error(
      `Tool "${definition.name}" must provide an execute function.`
    );
  }

  const normalizedDefinition: AgentToolDefinition = {
    ...definition,

    name:
      definition.name.trim(),

    description:
      definition.description.trim(),

    parameters:
      definition.parameters
        ? normalizeLegacyParameters(
            definition.parameters
          )
        : undefined,

    enabled:
      definition.enabled !== false,

    supportsParallel:
      definition.supportsParallel !== false,
  };

  if (
    tools.has(
      normalizedDefinition.name
    )
  ) {
    console.warn(
      `[AgentToolRegistry] Tool "${normalizedDefinition.name}" is being replaced.`
    );
  }

  tools.set(
    normalizedDefinition.name,
    normalizedDefinition
  );
}


export function getAgentTool(
  name: string
): AgentToolDefinition | undefined {
  if (
    typeof name !== 'string'
  ) {
    return undefined;
  }

  return tools.get(
    name.trim()
  );
}


export function listAgentTools(): AgentToolDefinition[] {
  return Array.from(
    tools.values()
  );
}


export function listEnabledAgentTools(): AgentToolDefinition[] {
  return Array.from(
    tools.values()
  ).filter(
    (tool) =>
      tool.enabled !== false
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
    timeoutMs?: number;
  } = {}
): Promise<AgentToolResult> {
  const startedAt =
    Date.now();

  const callId =
    createToolCallId(name);

  const tool =
    getAgentTool(name);

  if (!tool) {
    return {
      callId,
      name,
      success: false,
      error:
        `Tool "${name}" is not registered.`,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
    };
  }

  // ========================================
  // ENABLED CHECK
  // ========================================

  if (
    tool.enabled === false
  ) {
    return {
      callId,
      name,
      success: false,
      error:
        `Tool "${name}" is currently disabled.`,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
    };
  }

  const normalizedArgs =
    normalizeToolArguments(
      args
    );

  // ========================================
  // ARGUMENT VALIDATION
  // ========================================

  const validationError =
    validateToolArguments(
      tool,
      normalizedArgs
    );

  if (validationError) {
    return {
      callId,
      name,
      success: false,
      error:
        validationError,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
      metadata: {
        phase:
          'argument-validation',
      },
    };
  }

  // ========================================
  // CRITICAL ACTION SECURITY GATE
  // ========================================
  //
  // Critical / EXECUTE operations require:
  //
  // 1. executeActions === true
  // 2. approved === true
  //
  // Neither flag can substitute for the other.
  // ========================================

  if (
    tool.riskLevel === 'critical'
  ) {
    if (
      options.executeActions !== true ||
      options.approved !== true
    ) {
      return {
        callId,
        name,
        success: false,
        error:
          `APPROVAL_REQUIRED:${JSON.stringify({
            toolName: name,
            params: normalizedArgs,
            reason:
              `The "${name}" operation is a critical action and requires explicit user approval before execution.`,
          })}`,
        durationMs:
          Date.now() - startedAt,
        completedAt:
          new Date().toISOString(),
        metadata: {
          requiresApproval: true,
          riskLevel:
            tool.riskLevel,
          blocked:
            true,
        },
      };
    }
  }

  // ========================================
  // NON-CRITICAL APPROVAL GATE
  // ========================================

  if (
    tool.requiresApproval &&
    (
      options.approved !== true ||
      options.executeActions !== true
    )
  ) {
    return {
      callId,
      name,
      success: false,
      error:
        `APPROVAL_REQUIRED:${JSON.stringify({
          toolName: name,
          params: normalizedArgs,
          reason:
            `The "${name}" operation requires explicit user approval before execution.`,
        })}`,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
      metadata: {
        requiresApproval:
          true,
        riskLevel:
          tool.riskLevel,
        blocked:
          true,
      },
    };
  }

  // ========================================
  // EXECUTION
  // ========================================

  try {
    const configuredTimeout =
      options.timeoutMs ??
      tool.timeoutMs ??
      30000;

    const result =
      await executeWithTimeout(
        tool.execute(
          normalizedArgs,
          context
        ),
        configuredTimeout,
        name
      );

    return {
      callId,
      name,
      success: true,
      result,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
      metadata: {
        riskLevel:
          tool.riskLevel,
        category:
          tool.category,
      },
    };
  } catch (error: any) {
    const message =
      error?.message ||
      'Tool execution failed.';

    return {
      callId,
      name,
      success: false,
      error:
        message,
      durationMs:
        Date.now() - startedAt,
      completedAt:
        new Date().toISOString(),
      metadata: {
        riskLevel:
          tool.riskLevel,
        category:
          tool.category,
      },
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
// This adapter exposes those capabilities
// through the new agent runtime.
// ==========================================

export function registerMarketplaceTools(): void {
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

    // ========================================
    // PROTECT NATIVE RUNTIME TOOLS
    // ========================================

    if (
      RESERVED_NATIVE_TOOLS.has(
        name
      )
    ) {
      console.warn(
        `[AgentToolRegistry] Marketplace tool "${name}" conflicts with a reserved native tool and was not bridged.`
      );

      continue;
    }

    registerAgentTool({
      name,

      description,

      parameters:
        normalizeLegacyParameters(
          (marketplaceTool as any)
            .parameters
        ),

      category:
        'marketplace',

      tags: [
        'marketplace',
        'legacy-registry',
      ],

      supportsParallel:
        riskLevel !== 'EXECUTE',

      riskLevel:
        normalizeLegacyRisk(
          riskLevel
        ),

      requiresApproval:
        requiresLegacyApproval(
          riskLevel
        ),

      metadata: {
        source:
          'marketplace-tool-registry',

        allowedRoles:
          allowedRoles || [],

        legacyRiskLevel:
          riskLevel,
      },

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
        //
        // IMPORTANT:
        //
        // executeActions is NOT approval.
        //
        // approved is NOT execution permission
        // by itself.
        //
        // Critical actions require both.
        // ====================================

        const executeActions =
          context.metadata
            ?.executeActions === true;

        const approved =
          context.metadata
            ?.approved === true;

        if (
          riskLevel === 'EXECUTE' &&
          (
            executeActions !== true ||
            approved !== true
          )
        ) {
          throw new Error(
            `APPROVAL_REQUIRED:${JSON.stringify({
              toolName: name,
              params:
                args || {},
              reason:
                `The "${name}" operation requires explicit user approval and action execution permission.`,
            })}`
          );
        }

        // ====================================
        // EXECUTE THROUGH ORIGINAL REGISTRY
        // ====================================
        //
        // SECURITY FIX:
        //
        // Never use:
        //
        //   approved || executeActions
        //
        // as the approval value.
        //
        // executeActions does NOT mean approved.
        // ====================================

        const result =
          await marketplaceToolRegistry.executeTool(
            name,
            args || {},
            securityContext,
            approved
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

        if (
          !result.success
        ) {
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

          success:
            true,

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
// because they operate on the agent request
// context rather than marketplace handlers.
// ==========================================


// ==========================================
// ACTIVE PRODUCT CONTEXT
// ==========================================

registerAgentTool({
  name:
    'get_active_product_context',

  description:
    'Returns the currently selected product context when a product is active.',

  riskLevel:
    'low',

  category:
    'context',

  tags: [
    'context',
    'product',
  ],

  supportsParallel:
    true,

  parameters: {
    type:
      'object',

    properties:
      {},
  },

  execute: async (
    _args,
    context
  ) => {
    if (
      !context.product
    ) {
      return {
        available:
          false,

        message:
          'No active product context is available.',
      };
    }

    return {
      available:
        true,

      product:
        context.product,
    };
  },
});


// ==========================================
// USER CONTEXT
// ==========================================

registerAgentTool({
  name:
    'get_user_context',

  description:
    'Returns the current authenticated user context available to the AI runtime.',

  riskLevel:
    'low',

  category:
    'context',

  tags: [
    'context',
    'user',
  ],

  supportsParallel:
    true,

  parameters: {
    type:
      'object',

    properties:
      {},
  },

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
  name:
    'get_current_context',

  description:
    'Returns the structured context supplied to the current AI request.',

  riskLevel:
    'low',

  category:
    'context',

  tags: [
    'context',
    'request',
  ],

  supportsParallel:
    true,

  parameters: {
    type:
      'object',

    properties:
      {},
  },

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
// Native tools are registered first.
//
// Marketplace tools are then bridged without
// replacing reserved native capabilities.
// ==========================================

registerMarketplaceTools();


// ==========================================
// REGISTRY HEALTH / DISCOVERY HELPERS
// ==========================================

export function hasAgentTool(
  name: string
): boolean {
  return Boolean(
    getAgentTool(name)
  );
}


export function getAgentToolCount(): number {
  return tools.size;
}


export function getEnabledAgentToolCount(): number {
  return listEnabledAgentTools()
    .length;
}


export function getAgentToolNames(): string[] {
  return listAgentTools()
    .map(
      (tool) =>
        tool.name
    );
}


// ==========================================
// MARKETPLACE REGISTRY REFRESH
// ==========================================
//
// Useful when marketplace tools are registered
// dynamically after server startup.
//
// Existing agent-native tools remain intact.
// ==========================================

export function refreshMarketplaceTools(): void {
  registerMarketplaceTools();
}


// ==========================================
// REGISTRY DIAGNOSTICS
// ==========================================

export function getAgentToolDiagnostics(): {
  total: number;
  enabled: number;
  disabled: number;
  marketplace: number;
  context: number;
  critical: number;
  approvalRequired: number;
} {
  const registeredTools =
    listAgentTools();

  return {
    total:
      registeredTools.length,

    enabled:
      registeredTools.filter(
        (tool) =>
          tool.enabled !== false
      ).length,

    disabled:
      registeredTools.filter(
        (tool) =>
          tool.enabled === false
      ).length,

    marketplace:
      registeredTools.filter(
        (tool) =>
          tool.category ===
          'marketplace'
      ).length,

    context:
      registeredTools.filter(
        (tool) =>
          tool.category ===
          'context'
      ).length,

    critical:
      registeredTools.filter(
        (tool) =>
          tool.riskLevel ===
          'critical'
      ).length,

    approvalRequired:
      registeredTools.filter(
        (tool) =>
          tool.requiresApproval ===
          true
      ).length,
  };
}