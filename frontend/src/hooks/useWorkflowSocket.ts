import { useEffect } from 'react';
import { useIdeStore } from '@/store/ideStore';

export function useWorkflowSocket(projectId: string | null) {
  const { setWorkflowState, setStepStatus, resetWorkflow } = useIdeStore();

  useEffect(() => {
    if (!projectId) return;

    // Use relative URL for WebSocket to work in different environments
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/projects/${projectId}`;
    
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setWorkflowState('failed');
      return;
    }

    socket.onopen = () => {
      console.log('WebSocket connection established for project:', projectId);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);

        switch (message.type) {
          case 'workflow_started':
            // The UI should already be in 'running' state, but this confirms it.
            setWorkflowState('running');
            break;
          case 'workflow_progress':
            const { stepId, status } = message.payload;
            if (stepId && status) {
              setStepStatus(stepId, status);
            }
            break;
          case 'workflow_completed':
            setWorkflowState('completed');
            // Optionally, show a success message before resetting
            setTimeout(() => resetWorkflow(), 3000);
            break;
          case 'workflow_failed':
            setWorkflowState('failed');
            // Optionally, show an error message before resetting
            setTimeout(() => resetWorkflow(), 5000);
            break;
          default:
            console.warn('Received unknown WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWorkflowState('failed');
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.reason);
      // If the connection closes unexpectedly while running, mark as failed.
      if (useIdeStore.getState().workflowState === 'running') {
        setWorkflowState('failed');
      }
    };

    // Cleanup function to close the socket when the component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [projectId, setWorkflowState, setStepStatus, resetWorkflow]);
}