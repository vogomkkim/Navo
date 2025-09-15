import { useEffect, useRef } from "react";
import { useIdeStore } from "@/store/ideStore";

export function useWorkflowEvents(projectId: string | null) {
  const { setWorkflowState, setStepStatus, resetWorkflow } = useIdeStore();
  const sourceRef = useRef<EventSource | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 프로젝트가 비어지면 기존 연결 정리
    if (!projectId) {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
      sourceRef.current = null;
      connectingRef.current = false;
      return;
    }

    const httpProtocol = window.location.protocol; // 'http:' | 'https:'
    const backendHost =
      process.env.NEXT_PUBLIC_BACKEND_HOST ||
      (process.env.NODE_ENV === "development"
        ? "localhost:3001"
        : window.location.host);
    const sseUrl = `${httpProtocol}//${backendHost}/api/sse/projects/${projectId}`;

    // 중복 연결 가드: 이미 연결(또는 연결 중)이면 재연결 방지
    if (sourceRef.current) {
      const state = sourceRef.current.readyState; // 0 CONNECTING, 1 OPEN, 2 CLOSED
      if (state === 0 || state === 1) {
        return;
      }
    }
    if (connectingRef.current) return;
    connectingRef.current = true;

    let es: EventSource;
    try {
      es = new EventSource(sseUrl);
    } catch (error) {
      console.error("Failed to create SSE:", error);
      setWorkflowState("failed");
      connectingRef.current = false;
      return;
    }

    sourceRef.current = es;

    es.onopen = () => {
      console.log("SSE connection established for project:", projectId);
      connectingRef.current = false;
    };

    es.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("SSE message received:", message);

        switch (message.type) {
          case "workflow_started":
            // The UI should already be in 'running' state, but this confirms it.
            setWorkflowState("running");
            break;
          case "workflow_progress":
            const { stepId, status } = message.payload;
            if (stepId && status) {
              setStepStatus(stepId, status);
            }
            break;
          case "workflow_completed":
            setWorkflowState("completed");
            // Optionally, show a success message before resetting
            setTimeout(() => resetWorkflow(), 3000);
            break;
          case "workflow_failed":
            setWorkflowState("failed");
            // Optionally, show an error message before resetting
            setTimeout(() => resetWorkflow(), 5000);
            break;
          default:
            console.warn("Received unknown SSE message type:", message.type);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    es.onerror = (error) => {
      console.error("SSE error:", error);
      // EventSource는 자동 재연결 시도
    };

    // Cleanup function to close the socket when the component unmounts
    return () => {
      if (es) es.close();
      if (sourceRef.current === es) sourceRef.current = null;
      connectingRef.current = false;
    };
  }, [projectId, setWorkflowState, setStepStatus, resetWorkflow]);
}
