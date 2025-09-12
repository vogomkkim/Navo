'use client';

import React from 'react';
import { useIdeStore } from '@/store/ideStore';
import { useRunWorkflow } from '@/hooks/api/useWorkflow';

export function PlanConfirmation() {
  const {
    workflowPlan,
    resetWorkflow,
    selectedProjectId,
    setWorkflowState,
    setWorkflowOutputs,
  } = useIdeStore();

  const { mutate: runWorkflow, isPending } = useRunWorkflow({
    onSuccess: (data) => {
      console.log('Workflow executed successfully:', data);
      setWorkflowOutputs(data.payload.outputs);
      setWorkflowState('completed');
      // Maybe show a success message and then reset?
      setTimeout(() => {
        resetWorkflow();
      }, 5000); // Reset after 5 seconds
    },
    onError: (error) => {
      console.error('Workflow execution failed:', error);
      setWorkflowState('failed');
      // Maybe show an error message and then reset?
      setTimeout(() => {
        resetWorkflow();
      }, 5000); // Reset after 5 seconds
    },
  });

  const handleConfirm = () => {
    if (workflowPlan) {
      runWorkflow({
        plan: workflowPlan,
        projectId: selectedProjectId || undefined,
      });
    }
  };

  const handleCancel = () => {
    resetWorkflow();
  };

  if (!workflowPlan) {
    return (
      <div className="plan-confirmation-container p-4 border-t border-gray-200 bg-white">
        <p>작업 계획을 불러오는 중 오류가 발생했습니다.</p>
        <button onClick={handleCancel} className="btn btn-sm btn-ghost mt-2">
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="plan-confirmation-container p-4 border-t border-gray-200 bg-white animate-in fade-in-50">
      <h3 className="text-md font-semibold mb-3 text-gray-800">
        AI가 다음과 같은 작업을 제안합니다:
      </h3>
      <div className="plan-steps mb-4 space-y-2 max-h-48 overflow-y-auto pr-2">
        {workflowPlan.steps?.map((step: any, index: number) => (
          <div key={step.id} className="p-2 bg-gray-50 rounded-md">
            <p className="font-medium text-sm text-gray-700">{step.title}</p>
            <p className="text-xs text-gray-500">{step.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="btn btn-sm btn-ghost"
        >
          취소
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="btn btn-sm btn-primary"
        >
          {isPending ? '실행 중...' : '승인하고 계속하기'}
        </button>
      </div>
    </div>
  );
}