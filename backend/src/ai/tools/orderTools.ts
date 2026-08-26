import { ToolDefinition, SecurityContext, ToolExecutionResult } from './types';

// Mock/Fallback Service Interface to satisfy module resolution
class OrderService {
  async getById(orderId: string, userId: string, role: string) {
    return { id: orderId, userId, role, status: 'PENDING' };
  }

  async listOrders(params: { userId?: string; role?: string; storeId?: string; status?: string; limit?: number; page?: number }) {
    return [{ id: 'ord_123', status: params.status || 'DELIVERED' }];
  }

  async draftReturnRequest(orderId: string, reason: string, userId: string, items?: string[]) {
    return { orderId, reason, userId, items, approvalToken: 'tok_return_123' };
  }
}

const orderService = new OrderService();

export interface GetOrderStatusParams {
  orderId: string;
}

export interface GetOrdersHistoryParams {
  status?: string;
  limit?: number;
  page?: number;
}

export interface RequestReturnParams {
  orderId: string;
  reason: string;
  items?: string[];
}

export const getOrderStatusTool: ToolDefinition<GetOrderStatusParams> = {
  name: 'getOrderStatus',
  description: 'Retrieve current status, shipping tracking, and items for an order.',
  riskLevel: 'READ',
  allowedRoles: ['BUYER', 'SELLER', 'ADMIN', 'SUPPORT'],
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The unique order identifier' }
    },
    required: ['orderId']
  },
  handler: async (params, context): Promise<ToolExecutionResult> => {
    try {
      if (!context.userId) {
        return { success: false, error: 'Authentication required to inspect order status.', riskLevel: 'READ' };
      }
      const order = await orderService.getById(params.orderId, context.userId, context.role);
      return { success: true, data: order, riskLevel: 'READ' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error fetching order status', riskLevel: 'READ' };
    }
  }
};

export const getOrdersHistoryTool: ToolDefinition<GetOrdersHistoryParams> = {
  name: 'getOrdersHistory',
  description: 'Fetch historical list of customer or store orders.',
  riskLevel: 'READ',
  allowedRoles: ['BUYER', 'SELLER', 'ADMIN', 'SUPPORT'],
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status (e.g., PENDING, SHIPPED, DELIVERED)' },
      limit: { type: 'number', description: 'Max orders to return' },
      page: { type: 'number', description: 'Page index' }
    }
  },
  handler: async (params, context): Promise<ToolExecutionResult> => {
    try {
      if (!context.userId) {
        return { success: false, error: 'Authentication required to fetch order history.', riskLevel: 'READ' };
      }
      const orders = await orderService.listOrders({
        userId: context.userId,
        role: context.role,
        storeId: context.storeId,
        status: params.status,
        limit: params.limit || 10,
        page: params.page || 1
      });
      return { success: true, data: orders, riskLevel: 'READ' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error fetching order history', riskLevel: 'READ' };
    }
  }
};

export const requestReturnTool: ToolDefinition<RequestReturnParams> = {
  name: 'requestReturn',
  description: 'Initiate a return request for an eligible delivered order.',
  riskLevel: 'PREPARE',
  allowedRoles: ['BUYER', 'SUPPORT', 'ADMIN'],
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'Order ID to initiate return for' },
      reason: { type: 'string', description: 'Reason description for requesting a return' },
      items: { type: 'array', items: { type: 'string', description: 'Product item IDs' }, description: 'List of product IDs to return' }
    },
    required: ['orderId', 'reason']
  },
  handler: async (params, context): Promise<ToolExecutionResult> => {
    try {
      if (!context.userId) {
        return { success: false, error: 'Authentication required to initiate returns.', riskLevel: 'PREPARE' };
      }
      const returnDraft = await orderService.draftReturnRequest(params.orderId, params.reason, context.userId, params.items);
      return {
        success: true,
        data: returnDraft,
        riskLevel: 'PREPARE',
        requiresApproval: true,
        approvalToken: returnDraft.approvalToken
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create return request draft', riskLevel: 'PREPARE' };
    }
  }
};

export const orderTools = [
  getOrderStatusTool,
  getOrdersHistoryTool,
  requestReturnTool
];