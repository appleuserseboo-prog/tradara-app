import type { ToolExecutionPayload, ToolExecutionResult, ToolDefinitionSchema } from '../types/ai';

const getApiBaseUrl = (): string => {
  const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (globalObj.process?.env?.REACT_APP_API_URL) {
    return globalObj.process.env.REACT_APP_API_URL;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

export const aiApiService = {
  async executeTool(payload: ToolExecutionPayload): Promise<ToolExecutionResult> {
    const response = await fetch(`${API_BASE_URL}/ai/execute-tool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok && !data.requiresApproval) {
      throw new Error(data.error || 'Failed to execute AI tool');
    }
    return data.result || data;
  },

  async getAvailableTools(): Promise<ToolDefinitionSchema[]> {
    const response = await fetch(`${API_BASE_URL}/ai/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available AI tools');
    }
    const data = await response.json();
    return data.tools || [];
  }
};