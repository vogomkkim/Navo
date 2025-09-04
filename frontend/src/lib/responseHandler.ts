import { useIdeStore } from '@/store/ideStore';

// Define payload types based on server response
interface SimpleChatPayload {
  message: string;
}

interface WorkflowResultPayload {
  plan: any;
  outputs: any;
  summaryMessage: string;
}

interface ServerResponse {
  type: 'SIMPLE_CHAT' | 'WORKFLOW_RESULT' | 'FILE_CONTENT' | 'ERROR';
  payload: any;
}

// Main handler function
export function handleServerResponse(response: ServerResponse) {
  switch (response.type) {
    case 'SIMPLE_CHAT':
      handleSimpleChat(response.payload as SimpleChatPayload);
      break;
    case 'WORKFLOW_RESULT':
      handleWorkflowResult(response.payload as WorkflowResultPayload);
      break;
    // Add cases for other types as they are implemented
    case 'ERROR':
      handleError(response.payload);
      break;
    default:
      console.error('Unknown server response type:', response.type);
      handleError({ message: `알 수 없는 서버 응답 타입입니다: ${response.type}` });
  }
}

// --- Type-specific handlers ---

function handleSimpleChat(payload: SimpleChatPayload) {
  useIdeStore.getState().replaceThinkingMessage({
    role: 'Strategic Planner',
    message: payload.message,
    status: 'completed',
  });
}

function handleWorkflowResult(payload: WorkflowResultPayload) {
  // Invalidation is now handled by the useSendMessage mutation's onSuccess
  useIdeStore.getState().replaceThinkingMessage({
    role: 'DevOps Engineer',
    message: payload.summaryMessage,
    status: 'completed',
    details: payload.outputs,
  });
}

function handleError(payload: { message: string; details?: any }) {
  useIdeStore.getState().replaceThinkingMessage({
    role: 'Strategic Planner',
    message: `❌ 오류가 발생했습니다: ${payload.message}`,
    status: 'error',
    details: payload.details,
  });
}
