'use client';

import React from 'react';
import { useIdeStore } from '@/store/ideStore';
import type { StepStatus } from '@/store/ideStore';

const statusIcons: Record<StepStatus, React.ReactNode> = {
  completed: (
    <svg
      className="w-5 h-5 text-green-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  running: (
    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  ),
  pending: (
    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
  ),
  failed: (
    <svg
      className="w-5 h-5 text-red-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export function WorkflowProgress() {
  const { workflowPlan, stepStatuses, workflowState } = useIdeStore();

  if (!workflowPlan) {
    return (
      <div className="workflow-progress-container p-4 border-t border-gray-200 bg-white">
        <p>작업 정보를 불러오는 중...</p>
      </div>
    );
  }

  const getOverallStatusMessage = () => {
    switch (workflowState) {
      case 'running':
        return 'AI가 작업을 진행하고 있습니다...';
      case 'completed':
        return '작업이 성공적으로 완료되었습니다!';
      case 'failed':
        return '오류가 발생하여 작업을 중단했습니다.';
      default:
        return '작업 상태를 기다리는 중...';
    }
  };

  return (
    <div className="workflow-progress-container p-4 border-t border-gray-200 bg-white animate-in fade-in-50">
      <h3 className="text-md font-semibold mb-3 text-gray-800">
        {getOverallStatusMessage()}
      </h3>
      <div className="progress-steps space-y-2 max-h-48 overflow-y-auto pr-2">
        {workflowPlan.steps?.map((step: any) => {
          const status = stepStatuses[step.id] || 'pending';
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                {statusIcons[status]}
              </div>
              <p
                className={`text-sm ${
                  status === 'completed'
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700'
                }`}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
