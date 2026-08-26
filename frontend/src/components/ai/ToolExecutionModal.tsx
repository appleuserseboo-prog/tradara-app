import React from 'react';
import type { PendingToolApproval } from '../types/ai';

interface ToolExecutionModalProps {
  isOpen: boolean;
  pendingApproval: PendingToolApproval | null;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const ToolExecutionModal: React.FC<ToolExecutionModalProps> = ({
  isOpen,
  pendingApproval,
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  if (!isOpen || !pendingApproval) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-2 text-amber-600 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900">Action Approval Required</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Tradara AI is requesting permission to execute a high-impact operation (<strong>{pendingApproval.riskLevel}</strong> level).
        </p>

        <div className="rounded-md bg-gray-50 p-3 mb-4 text-xs font-mono border border-gray-200">
          <div className="font-semibold text-gray-800 mb-1">Tool: {pendingApproval.toolName}</div>
          <div className="text-gray-600">
            Parameters:
            <pre className="mt-1 overflow-x-auto text-[11px]">{JSON.stringify(pendingApproval.parameters, null, 2)}</pre>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center"
          >
            {isExecuting ? 'Executing...' : 'Approve & Execute'}
          </button>
        </div>
      </div>
    </div>
  );
};
