// ==========================================
// FILE: backend/src/controllers/agentController.ts
// TRADARA AI — Agent Gateway Controller
// ==========================================

import { Request, Response } from 'express';

import {
  AgentContext,
  AgentEvent,
  AgentRequest,
  AgentResponse,
} from '../ai/agent/types';

import { executeAgent } from '../ai/agent/agentOrchestrator';

// ==========================================
// Authentication Helpers
// ==========================================

function getBearerToken(
  req: Request
): string | null {
  const header =
    req.headers.authorization;

  if (!header) {
    return null;
  }

  if (
    !header
      .toLowerCase()
      .startsWith('bearer ')
  ) {
    return null;
  }

  return (
    header
      .slice(7)
      .trim() || null
  );
}

function getUserId(
  req: Request
): string | undefined {
  return (
    (req as any).user?.id ||
    (req.body?.userId as
      | string
      | undefined)
  );
}

// ==========================================
// Context Construction
// ==========================================

function getAgentContext(
  req: Request
): AgentContext {
  const bodyContext =
    req.body?.context || {};

  const authenticatedUser =
    (req as any).user;

  const bodyProduct =
    bodyContext.product;

  const bodyProject =
    bodyContext.project;

  const bodyUser =
    bodyContext.user;

  const attachments =
    Array.isArray(
      req.body?.attachments
    )
      ? req.body.attachments
      : Array.isArray(
          bodyContext.attachments
        )
      ? bodyContext.attachments
      : [];

  const messages =
    Array.isArray(
      bodyContext.messages
    )
      ? bodyContext.messages
      : Array.isArray(
          req.body?.history
        )
      ? req.body.history
          .filter(
            (item: any) =>
              item &&
              (item.role ===
                'user' ||
                item.role ===
                  'model' ||
                item.role ===
                  'assistant')
          )
          .map(
            (item: any) => ({
              role:
                item.role ===
                'model'
                  ? 'assistant'
                  : item.role,
              content:
                Array.isArray(
                  item.parts
                )
                  ? item.parts
                      .map(
                        (
                          part: any
                        ) =>
                          part?.text ||
                          ''
                      )
                      .join('')
                  : String(
                      item.content ||
                        ''
                    ),
            })
          )
      : [];

  const resolvedUserId =
    bodyUser?.userId ||
    authenticatedUser?.id ||
    req.body?.userId;

  const resolvedUserName =
    bodyUser?.name ||
    authenticatedUser?.name;

  const resolvedUserEmail =
    bodyUser?.email ||
    authenticatedUser?.email;

  const resolvedUserRole =
    bodyUser?.role ||
    authenticatedUser?.role;

  return {
    ...bodyContext,

    conversationId:
      bodyContext.conversationId ||
      req.body?.conversationId ||
      req.body?.sessionId,

    taskId:
      bodyContext.taskId ||
      req.body?.taskId,

    user: {
      ...(bodyUser || {}),

      userId:
        resolvedUserId,

      name:
        resolvedUserName,

      email:
        resolvedUserEmail,

      role:
        resolvedUserRole,
    },

    product:
      bodyProduct,

    project:
      bodyProject,

    messages,

    attachments,

    memory:
      Array.isArray(
        bodyContext.memory
      )
        ? bodyContext.memory
        : [],

    globalContext:
      bodyContext.globalContext ||
      {},

    metadata: {
      ...(bodyContext.metadata ||
        {}),

      authenticated:
        Boolean(
          authenticatedUser?.id
        ),

      hasBearerToken:
        Boolean(
          getBearerToken(req)
        ),

      source:
        'tradara-agent-gateway',
    },
  };
}

// ==========================================
// Agent Request Construction
// ==========================================

function buildAgentRequest(
  req: Request,
  context: AgentContext,
  message: string
): AgentRequest {
  const body =
    req.body || {};

  return {
    message,

    conversationId:
      body.conversationId ||
      body.threadId ||
      body.sessionId,

    sessionId:
      body.sessionId,

    taskId:
      body.taskId,

    itemId:
      body.itemId ||
      body.product?.id ||
      context.product?.itemId,

    buyerSession:
      body.buyerSession ||
      body.conversationId ||
      context.conversationId,

    userId:
      getUserId(req),

    agent:
      body.agent,

    intent:
      body.intent,

    context,

    attachments:
      context.attachments,

    stream:
      body.stream !== false,

    executeActions:
      body.executeActions === true,

    approvedAction:
      body.approvedAction,

    metadata: {
      ...(body.metadata || {}),

      threadId:
        body.threadId,

      sessionId:
        body.sessionId,

      confirmation:
        body.userConfirmationConfirmed ===
        true,

      pendingTool:
        body.pendingTool,

      frontend:
        'TradaraAISidebar',
    },
  };
}

// ==========================================
// SSE Helpers
// ==========================================

function writeSse(
  res: Response,
  payload: any
): void {
  try {
    res.write(
      `data: ${JSON.stringify(
        payload
      )}\n\n`
    );
  } catch {
    // Client may have disconnected.
  }
}

function writeSseDone(
  res: Response
): void {
  try {
    res.write(
      'data: [DONE]\n\n'
    );
  } catch {
    // Client may have disconnected.
  }
}

function writeSseEvent(
  res: Response,
  event: AgentEvent
): void {
  /*
   * The existing TradaraAISidebar expects
   * either:
   *
   *   { type: 'text', content: '...' }
   *
   * or:
   *
   *   { chunk: '...' }
   *
   * We therefore translate the new Agent Runtime
   * events into a backwards-compatible SSE layer.
   */

  switch (event.type) {
    // ========================================
    // Agent Started
    // ========================================

    case 'start': {
      writeSse(res, {
        type: 'status',

        status:
          event.status ||
          'planning',

        requestId:
          event.requestId,

        agent:
          event.agent,

        intent:
          event.intent,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Status
    // ========================================

    case 'status': {
      writeSse(res, {
        type: 'status',

        status:
          event.status,

        requestId:
          event.requestId,

        agent:
          event.agent,

        intent:
          event.intent,

        metadata:
          event.metadata,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Plan
    // ========================================

    case 'plan': {
      writeSse(res, {
        type: 'plan',

        requestId:
          event.requestId,

        plan:
          event.plan,

        agent:
          event.agent,

        intent:
          event.intent,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Tool Started
    // ========================================

    case 'tool_start': {
      writeSse(res, {
        type: 'tool',

        status:
          'started',

        requestId:
          event.requestId,

        toolCall:
          event.toolCall,

        toolName:
          event.toolCall?.name,

        name:
          event.toolCall?.name,

        args:
          event.toolCall?.args,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Tool Result
    // ========================================

    case 'tool_result': {
      writeSse(res, {
        type: 'tool',

        status:
          event.toolResult
            ?.success
            ? 'completed'
            : 'failed',

        requestId:
          event.requestId,

        toolResult:
          event.toolResult,

        toolName:
          event.toolResult?.name,

        name:
          event.toolResult?.name,

        result:
          event.toolResult?.result,

        error:
          event.toolResult?.error,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // AI Content
    // ========================================

    case 'content': {
      if (
        event.content
      ) {
        /*
         * The current frontend accumulates
         * parsed.chunk values.
         *
         * Therefore content is emitted as a
         * chunk as well as a text event.
         */

        writeSse(res, {
          chunk:
            event.content,

          type:
            'text',

          content:
            event.content,

          requestId:
            event.requestId,

          agent:
            event.agent,

          intent:
            event.intent,

          timestamp:
            event.timestamp,
        });
      }

      return;
    }

    // ========================================
    // Warning
    // ========================================

    case 'warning': {
      writeSse(res, {
        type:
          'warning',

        warning:
          event.content ||
          event.error ||
          'Tradara AI returned a warning.',

        requestId:
          event.requestId,

        metadata:
          event.metadata,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Approval Required
    // ========================================

    case 'approval_required': {
      const pendingAction =
        event.pendingAction;

      /*
       * This deliberately matches the
       * existing TradaraAISidebar confirmation
       * contract.
       */

      writeSse(res, {
        type:
          'approval_required',

        requestId:
          event.requestId,

        requiresConfirmation:
          true,

        requiresApproval:
          true,

        pendingToolDetails:
          pendingAction
            ? {
                toolName:
                  pendingAction.toolName,

                params:
                  pendingAction.params,

                reason:
                  pendingAction.reason,
              }
            : undefined,

        pendingAction,

        content:
          event.content ||
          'This action requires your confirmation before it can be executed.',

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Verification
    // ========================================

    case 'verification': {
      writeSse(res, {
        type:
          'verification',

        requestId:
          event.requestId,

        verification:
          event.verification,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Complete
    // ========================================

    case 'complete': {
      writeSse(res, {
        type:
          'status',

        status:
          'completed',

        requestId:
          event.requestId,

        agent:
          event.agent,

        intent:
          event.intent,

        verification:
          event.verification,

        metadata:
          event.metadata,

        timestamp:
          event.timestamp,
      });

      return;
    }

    // ========================================
    // Error
    // ========================================

    case 'error': {
      writeSse(res, {
        type:
          'error',

        error:
          event.error ||
          event.content ||
          'Tradara AI encountered an error.',

        requestId:
          event.requestId,

        status:
          'failed',

        timestamp:
          event.timestamp,
      });

      return;
    }

    default: {
      /*
       * Future agent events should not break
       * the stream.
       */

      writeSse(res, {
        type:
          'agent_event',

        requestId:
          event.requestId,

        event,

        timestamp:
          event.timestamp,
      });
    }
  }
}

// ==========================================
// Convert Agent Response → Legacy AI Shape
// ==========================================

function buildLegacyResponse(
  result: AgentResponse
): Record<string, any> {
  const pendingToolDetails =
    result.pendingAction
      ? {
          toolName:
            result.pendingAction
              .toolName,

          params:
            result.pendingAction
              .params,

          reason:
            result.pendingAction
              .reason,
        }
      : undefined;

  const toolExecutions =
    result.toolResults?.map(
      (tool) => ({
        toolName:
          tool.name,

        name:
          tool.name,

        status:
          tool.success
            ? 'completed'
            : 'failed',

        result:
          tool.result,

        error:
          tool.error,

        durationMs:
          tool.durationMs,
      })
    ) || [];

  return {
    success:
      result.success,

    requestId:
      result.requestId,

    response:
      result.content,

    message:
      result.content,

    reply:
      result.content,

    content:
      result.content,

    agent:
      result.agent,

    intent:
      result.intent,

    status:
      result.status,

    plan:
      result.plan,

    toolCalls:
      result.toolCalls,

    toolResults:
      result.toolResults,

    toolExecutions,

    verification:
      result.verification,

    requiresConfirmation:
      Boolean(
        result.requiresApproval
      ),

    requiresApproval:
      Boolean(
        result.requiresApproval
      ),

    pendingToolDetails,

    pendingAction:
      result.pendingAction,

    metadata:
      result.metadata,

    error:
      result.error,
  };
}

// ==========================================
// Main Agent Gateway
// ==========================================

export const executeAgentRequest =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const startedAt =
      Date.now();

    try {
      const body =
        req.body || {};

      const message =
        typeof body.message ===
        'string'
          ? body.message.trim()
          : '';

      if (!message) {
        res.status(400).json({
          success: false,

          error:
            'message is required.',
        });

        return;
      }

      const context =
        getAgentContext(req);

      const request =
        buildAgentRequest(
          req,
          context,
          message
        );

      const wantsStream =
        request.stream !== false;

      // ======================================
      // Non-streaming request
      // ======================================

      if (!wantsStream) {
        const result =
          await executeAgent(
            request,
            context,
            {
              executeActions:
                request.executeActions ===
                true,
            }
          );

        const response =
          buildLegacyResponse(
            result
          );

        res
          .status(
            result.success
              ? 200
              : 500
          )
          .json({
            ...response,

            durationMs:
              Date.now() -
              startedAt,
          });

        return;
      }

      // ======================================
      // SSE Headers
      // ======================================

      res.status(200);

      res.setHeader(
        'Content-Type',
        'text/event-stream; charset=utf-8'
      );

      res.setHeader(
        'Cache-Control',
        'no-cache, no-transform'
      );

      res.setHeader(
        'Connection',
        'keep-alive'
      );

      res.setHeader(
        'X-Accel-Buffering',
        'no'
      );

      /*
       * Flush headers immediately when supported.
       *
       * This is important for Render/proxies because
       * otherwise the frontend may sit waiting while
       * the backend is already processing.
       */

      try {
        res.flushHeaders?.();
      } catch {
        // Not available on every Express response.
      }

      // ======================================
      // Initial Connection Event
      // ======================================

      writeSse(res, {
        type:
          'connected',

        status:
          'connected',

        timestamp:
          new Date().toISOString(),
      });

      // ======================================
      // Agent Event Bridge
      // ======================================

      const sendEvent =
        (event: AgentEvent) => {
          if (res.writableEnded) {
            return;
          }

          writeSseEvent(
            res,
            event
          );
        };

      // ======================================
      // Execute Agent
      // ======================================

      const result =
        await executeAgent(
          request,
          context,
          {
            executeActions:
              request.executeActions ===
              true,
          },
          sendEvent
        );

      // ======================================
      // Final Compatibility Event
      // ======================================

      if (!res.writableEnded) {
        const legacy =
          buildLegacyResponse(
            result
          );

        writeSse(res, {
          type:
            'final',

          done:
            true,

          requestId:
            result.requestId,

          response:
            result.content,

          message:
            result.content,

          content:
            result.content,

          agent:
            result.agent,

          intent:
            result.intent,

          status:
            result.status,

          success:
            result.success,

          plan:
            result.plan,

          toolExecutions:
            legacy.toolExecutions,

          toolResults:
            result.toolResults,

          toolCalls:
            result.toolCalls,

          verification:
            result.verification,

          requiresConfirmation:
            Boolean(
              result.requiresApproval
            ),

          requiresApproval:
            Boolean(
              result.requiresApproval
            ),

          pendingToolDetails:
            legacy.pendingToolDetails,

          pendingAction:
            result.pendingAction,

          metadata:
            {
              ...(result.metadata ||
                {}),

              durationMs:
                Date.now() -
                startedAt,
            },

          timestamp:
            new Date().toISOString(),
        });

        writeSseDone(res);

        res.end();
      }
    } catch (error: any) {
      console.error(
        '[Tradara Agent Gateway Error]:',
        error
      );

      const errorMessage =
        error?.message ||
        'Failed to execute Tradara AI agent.';

      const errorPayload = {
        type:
          'error',

        requestId:
          `agent_error_${Date.now()}`,

        timestamp:
          new Date().toISOString(),

        status:
          'failed',

        success:
          false,

        error:
          errorMessage,
      };

      // ======================================
      // Error before SSE headers
      // ======================================

      if (!res.headersSent) {
        res
          .status(500)
          .json(errorPayload);

        return;
      }

      // ======================================
      // Error during active SSE stream
      // ======================================

      try {
        writeSse(
          res,
          errorPayload
        );

        writeSseDone(res);

        res.end();
      } catch {
        // Ignore disconnected clients.
      }
    }
  };