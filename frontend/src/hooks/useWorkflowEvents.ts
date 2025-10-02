import { useEffect, useRef, useCallback } from "react";
import { useIdeStore } from "@/store/ideStore";
import { useAuth } from "@/app/context/AuthContext";
import { fetchSseTicket } from "@/lib/apiClient";

export function useWorkflowEvents(projectId: string | null) {
  const { setWorkflowState, setStepStatus, resetWorkflow } = useIdeStore();
  const { token } = useAuth();
  const sourceRef = useRef<EventSource | null>(null);
  const connectingRef = useRef(false);

  // SSE 연결 함수
  const connectSSE = useCallback(async (): Promise<boolean> => {
    if (!projectId || !token) return false;

    connectingRef.current = true;

    try {
      const { ticket } = await fetchSseTicket(token);

      // SSE는 프록시를 우회하고 직접 백엔드에 연결
      const httpProtocol = window.location.protocol;
      const backendHost =
        process.env.NODE_ENV === "development"
          ? "localhost:3001"
          : process.env.NEXT_PUBLIC_BACKEND_HOST || window.location.host;
      const sseUrl = `${httpProtocol}//${backendHost}/api/sse/projects/${projectId}?ticket=${ticket}`;

      const es = new EventSource(sseUrl);
      sourceRef.current = es;

      return new Promise((resolve) => {
        es.onopen = () => {
          console.log("✅ SSE 연결 성공 - 프로젝트:", projectId);
          connectingRef.current = false;
          resolve(true);
        };

        es.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case "connection_established":
                // 연결 확인 - 조용히 처리
                break;
              case "workflow_started":
                setWorkflowState("running");
                // 워크플로우 시작 메시지 추가
                if (message.payload?.message) {
                  useIdeStore.getState().addMessage({
                    id: `workflow-start-${Date.now()}`,
                    role: "assistant",
                    content: message.payload.message,
                    timestamp: new Date().toISOString(),
                    status: "thinking",
                    isLive: true,
                  });
                }
                break;
              case "workflow_progress":
                const {
                  stepId,
                  status,
                  message: stepMessage,
                  stepTitle,
                } = message.payload;
                if (stepId && status) {
                  setStepStatus(stepId, status);

                  // 실시간 메시지 추가
                  if (stepMessage && stepTitle) {
                    useIdeStore.getState().addMessage({
                      id: `workflow-${stepId}-${Date.now()}`,
                      role: "assistant",
                      content: stepMessage,
                      timestamp: new Date().toISOString(),
                      status: status === "running" ? "thinking" : "success",
                      isLive: true,
                    });
                  }
                }
                break;
              case "workflow_completed":
                setWorkflowState("completed");
                setTimeout(() => resetWorkflow(), 3000);
                break;
              case "workflow_failed":
                setWorkflowState("failed");
                // 실패 메시지 추가 - 사용자 친화적 메시지
                if (message.payload?.error) {
                  // 기술적 에러를 사용자 친화적 메시지로 변환
                  const getUserFriendlyMessage = (error: string) => {
                    if (error.includes('circular dependency')) {
                      return '요청을 처리하는 중에 문제가 발생했습니다. 다시 시도해주세요.';
                    }
                    if (error.includes('No root nodes found')) {
                      return '요청을 이해하지 못했습니다. 다른 방식으로 말씀해주세요.';
                    }
                    if (error.includes('timeout')) {
                      return '처리 시간이 오래 걸려 중단되었습니다. 다시 시도해주세요.';
                    }
                    // 기본 메시지
                    return '요청을 처리하는 중에 문제가 발생했습니다. 다시 시도해주세요.';
                  };

                  useIdeStore.getState().addMessage({
                    id: `workflow-failed-${Date.now()}`,
                    role: "assistant",
                    content: getUserFriendlyMessage(message.payload.error),
                    timestamp: new Date().toISOString(),
                    status: "error",
                    error: message.payload.error, // 기술적 정보는 error 필드에 보관
                    isLive: true,
                  });

                  // 부드럽게 스크롤 다운
                  setTimeout(() => {
                    const messagesEndRef = document.querySelector('[data-messages-end]');
                    if (messagesEndRef) {
                      messagesEndRef.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }
                setTimeout(() => resetWorkflow(), 5000);
                break;

              case "question_answered":
                // 질문 답변 처리
                if (message.payload?.answer) {
                  useIdeStore.getState().addMessage({
                    id: `question-answer-${Date.now()}`,
                    role: "assistant",
                    content: message.payload.answer,
                    timestamp: new Date().toISOString(),
                    status: "completed",
                    isLive: true,
                  });

                  // 부드럽게 스크롤 다운
                  setTimeout(() => {
                    const messagesEndRef = document.querySelector('[data-messages-end]');
                    if (messagesEndRef) {
                      messagesEndRef.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }
                break;
              case "AI_RESPONSE_COMPLETE":
                // AI 응답 완료 - 채팅에 메시지 추가
                console.log("✅ AI 응답 수신:", message.message);
                useIdeStore.getState().addMessage({
                  id: `ai-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                  role: "assistant",
                  content: message.message,
                  timestamp: new Date().toISOString(),
                  status: "success",
                });

                // 부드럽게 스크롤 다운
                setTimeout(() => {
                  const messagesEndRef = document.querySelector('[data-messages-end]');
                  if (messagesEndRef) {
                    messagesEndRef.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
                break;
              case "AI_RESPONSE_ERROR":
                // AI 응답 오류
                console.error("❌ AI 응답 오류:", message.error);
                useIdeStore.getState().addMessage({
                  id: `ai-error-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                  role: "assistant",
                  content: message.message,
                  timestamp: new Date().toISOString(),
                  status: "error",
                  error: message.error,
                });
                break;
              case "connected":
                // SSE 연결 확인 메시지
                console.log("🔗 SSE 연결 확인:", message.projectId || "프로젝트 ID 없음");
                break;
              case "TEST_MESSAGE":
                // 테스트 메시지 - 개발 환경에서만 로그
                if (process.env.NODE_ENV === "development") {
                  console.log("✅ SSE 테스트 메시지 수신:", message.message);
                }
                break;
              default:
                console.warn(
                  "Received unknown SSE message type:",
                  message.type
                );
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        es.onerror = (error) => {
          console.error("SSE 연결 실패:", error);
          connectingRef.current = false;
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      connectingRef.current = false;
      return false;
    }
  }, [projectId, token]);

  // 수동 연결 함수 - 채팅 메시지 전송 시 호출
  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (!projectId || !token) return false;

    // 이미 연결되어 있으면 성공
    if (
      sourceRef.current &&
      sourceRef.current.readyState === EventSource.OPEN
    ) {
      return true;
    }

    // 연결 중이면 대기
    if (connectingRef.current) {
      return new Promise<boolean>((resolve) => {
        const checkConnection = () => {
          if (
            sourceRef.current &&
            sourceRef.current.readyState === EventSource.OPEN
          ) {
            resolve(true);
          } else if (!connectingRef.current) {
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    // 새로 연결 시도
    return await connectSSE();
  }, [projectId, token, connectSSE]);

  // 프로젝트 변경 시 기존 연결 정리 및 새 연결
  useEffect(() => {
    if (!projectId && sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
      connectingRef.current = false;
    } else if (projectId && token) {
      // 프로젝트가 선택되면 자동으로 SSE 연결
      connectSSE();
    }
  }, [projectId, token, connectSSE]);

  // 컴포넌트 언마운트 시 연결 정리
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      connectingRef.current = false;
    };
  }, []);

  // 수동 연결 함수를 반환하여 외부에서 호출 가능하게 함
  return { ensureConnection, connectSSE };
}
