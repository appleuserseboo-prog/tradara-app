import { ToolDefinition, SecurityContext, ToolExecutionResult } from './types';

// Mock/Fallback Service Interface to satisfy module resolution
class AnalyticsService {
  async getPerformanceSummary(storeId: string, timeframe: string) {
    return { storeId, timeframe, revenue: 0, orders: 0, conversionRate: '0%' };
  }

  async getSalesMetricsData(params: { storeId?: string; startDate?: string; endDate?: string; groupBy?: string }) {
    return { storeId: params.storeId, totalSales: 0, averageOrderValue: 0 };
  }
}

const analyticsService = new AnalyticsService();

export interface GetStorePerformanceParams {
  storeId?: string;
  timeframe?: 'day' | 'week' | 'month' | 'year';
  metrics?: string[];
}

export interface GetSalesMetricsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export const getStorePerformanceTool: ToolDefinition<GetStorePerformanceParams> = {
  name: 'getStorePerformance',
  description: 'Retrieve revenue, conversion rates, traffic, and order volumes for a store.',
  riskLevel: 'READ',
  allowedRoles: ['SELLER', 'ADMIN'],
  parameters: {
    type: 'object',
    properties: {
      storeId: { type: 'string', description: 'Optional target store ID if admin' },
      timeframe: { type: 'string', enum: ['day', 'week', 'month', 'year'], description: 'Time interval breakdown' },
      metrics: { type: 'array', items: { type: 'string', description: 'Metric name' }, description: 'Specific metrics to fetch' }
    }
  },
  handler: async (params, context): Promise<ToolExecutionResult> => {
    try {
      const targetStoreId = context.role === 'ADMIN' ? (params.storeId || context.storeId) : context.storeId;
      if (!targetStoreId) {
        return { success: false, error: 'Store context missing for performance query.', riskLevel: 'READ' };
      }
      const performance = await analyticsService.getPerformanceSummary(targetStoreId, params.timeframe || 'month');
      return { success: true, data: performance, riskLevel: 'READ' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to retrieve store performance', riskLevel: 'READ' };
    }
  }
};

export const getSalesMetricsTool: ToolDefinition<GetSalesMetricsParams> = {
  name: 'getSalesMetrics',
  description: 'Retrieve breakdown of total sales volume, average order values, and revenue growth.',
  riskLevel: 'READ',
  allowedRoles: ['SELLER', 'ADMIN'],
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date in ISO format' },
      endDate: { type: 'string', description: 'End date in ISO format' },
      groupBy: { type: 'string', enum: ['day', 'week', 'month'], description: 'Grouping interval' }
    }
  },
  handler: async (params, context): Promise<ToolExecutionResult> => {
    try {
      const targetStoreId = context.storeId;
      if (!targetStoreId && context.role !== 'ADMIN') {
        return { success: false, error: 'Store authorization missing for sales metrics.', riskLevel: 'READ' };
      }
      const salesData = await analyticsService.getSalesMetricsData({
        storeId: targetStoreId,
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: params.groupBy || 'day'
      });
      return { success: true, data: salesData, riskLevel: 'READ' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to retrieve sales metrics', riskLevel: 'READ' };
    }
  }
};

export const analyticsTools = [
  getStorePerformanceTool,
  getSalesMetricsTool
];