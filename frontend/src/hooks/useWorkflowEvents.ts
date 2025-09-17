import { useEffect, useRef } from "react";
import { useIdeStore } from "@/store/ideStore";
import { useAuth } from "@/app/context/AuthContext";
import { fetchSseTicket } from "@/lib/apiClient";

export function useWorkflowEvents(projectId: string | null) {
  const { setWorkflowState, setStepStatus, resetWorkflow } = useIdeStore();
  const { token } = useAuth();
  const sourceRef = useRef<EventSource | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !token) return;

    // 프로젝트가 비어지면 기존 연결 정리
    if (!projectId) {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
      sourceRef.current = null;
      connectingRef.current = false;
      return;
    }

    // 중복 연결 가드
    if (sourceRef.current) {
      const state = sourceRef.current.readyState; // 0 CONNECTING, 1 OPEN, 2 CLOSED
      if (state === 0 || state === 1) {
        return;
      }
    }
    if (connectingRef.current) return;
    

    let es: EventSource;

    const connect = async () => {
      if (connectingRef.current) return;
      connectingRef.current = true;

      try {
        const { ticket } = await fetchSseTicket(token);

        const httpProtocol = window.location.protocol;
        const backendHost =
          process.env.NEXT_PUBLIC_BACKEND_HOST ||
          (process.env.NODE_ENV === "development"
            ? "localhost:3001"
            : window.location.host);
        const sseUrl = `${httpProtocol}//${backendHost}/api/sse/projects/${projectId}?ticket=${ticket}`;
        
        es = new EventSource(sseUrl);
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
                setTimeout(() => resetWorkflow(), 3000);
                break;
              case "workflow_failed":
                setWorkflowState("failed");
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
          // EventSource will automatically try to reconnect.
          // On some errors (like 401 from server), it will stop.
        };

      } catch (error) {
        console.error("Failed to establish SSE connection:", error);
        setWorkflowState("failed");
        connectingRef.current = false;
      }
    };

    connect();

    // Cleanup function
    return () => {
      if (es) es.close();
      if (sourceRef.current === es) sourceRef.current = null;
      connectingRef.current = false;
    };
  }, [projectId, token, setWorkflowState, setStepStatus, resetWorkflow]);
}
