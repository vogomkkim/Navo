import { FastifyInstance } from "fastify";
import { OrchestratorService } from "@/core/orchestrator/orchestrator.service";
import { WorkflowService } from "./workflow.service";
import crypto from "crypto";

// A simple in-memory store for one-time SSE authentication tickets
export const sseTicketManager = {
  tickets: new Map<string, { userId: string; expiresAt: number }>(),

  issue(userId: string): string {
    const ticket = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 15000; // Ticket is valid for 15 seconds
    this.tickets.set(ticket, { userId, expiresAt });
    return ticket;
  },

  verify(ticket: string): { userId: string } | null {
    const record = this.tickets.get(ticket);
    if (!record) {
      return null; // Ticket not found
    }

    // Immediately delete the ticket to prevent reuse
    this.tickets.delete(ticket);

    if (Date.now() > record.expiresAt) {
      return null; // Ticket expired
    }

    return { userId: record.userId };
  },
};

// A simple in-memory connection manager for SSE
export const connectionManager = {
  sseConns: new Map<string, Set<NodeJS.WritableStream>>(),

  broadcast(projectId: string, message: unknown) {
    const sseSet = this.sseConns.get(projectId);
    if (!sseSet) return;

    let msg: string;
    try {
      msg = JSON.stringify(message);
    } catch {
      console.log("[SSE] 메시지 직렬화 실패. 브로드캐스트를 건너뜁니다.");
      return;
    }

    const frame = `data: ${msg}\n\n`;
    for (const stream of sseSet) {
      try {
        stream.write(frame);
      } catch {
        // broken pipe; will be cleaned on close
      }
    }
  },
  addSse(projectId: string, stream: NodeJS.WritableStream) {
    const set = this.sseConns.get(projectId) ?? new Set();
    set.add(stream);
    this.sseConns.set(projectId, set);
  },
  removeSse(projectId: string, stream: NodeJS.WritableStream) {
    const set = this.sseConns.get(projectId);
    if (!set) return;
    set.delete(stream);
    if (set.size === 0) this.sseConns.delete(projectId);
  },
};

export function workflowController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);
  const workflowService = new WorkflowService(app);

  // SSE route (server -> client events)
  app.get("/api/sse/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { ticket } = request.query as { ticket?: string };
    const origin = request.headers.origin as string | undefined;

    if (!ticket) {
      return reply.code(401).send("Authentication ticket is missing.");
    }

    const verification = sseTicketManager.verify(ticket);
    if (!verification) {
      return reply.code(401).send("Invalid or expired authentication ticket.");
    }

    // --- SSE 필수 헤더
    reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    // 압축 확실히 끄기 (전역 compression 플러그인 쓴다면 라우트 제외가 더 안전)
    reply.header("Content-Encoding", "");

    // CORS (credentials 쓸 거면 * 금지)
    if (origin) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Vary", "Origin");
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      // 필요 없다면 이 두 줄 빼도 됨
      reply.raw.setHeader("Access-Control-Allow-Origin", "*");
      reply.raw.setHeader("Access-Control-Allow-Credentials", "false");
    }

    // --- (가장 중요) Fastify 응답 관리에서 분리
    // Fastify 응답 객체를 직접 조작하기 위해 사용
    reply.hijack();

    const res = reply.raw;

    // 헤더 즉시 전송
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    // 연결 직후 환영 이벤트
    res.write(
      'data: {"type":"connection_established","message":"SSE 연결 성공"}\n\n'
    );

    // 하트비트 (프록시/브라우저 타임아웃 방지)
    const heartbeat = setInterval(() => {
      try {
        res.write(":heartbeat\n\n");
      } catch {}
    }, 25000);

    // 컨넥션 매니저에 등록 (나중에 다른 곳에서 write 할 수 있게)
    connectionManager.addSse(projectId, res);

    // 테스트 이벤트 (3초 후)
    const testTimer = setTimeout(() => {
      try {
        const testMessage = JSON.stringify({
          type: "TEST_MESSAGE",
          message: "연결 동작 중 - SSE 테스트 성공!",
          timestamp: new Date().toISOString(),
          projectId,
        });
        res.write(`data: ${testMessage}\n\n`);
      } catch (e) {
        console.error("[SSE Test] write failed:", e);
      }
    }, 3000);

    // 연결 종료 처리
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      clearTimeout(testTimer);
      connectionManager.removeSse?.(projectId, res);
      try {
        res.end();
      } catch {}
    });
  });

  // Route to issue a one-time ticket for SSE authentication
  app.post(
    "/api/sse/ticket",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string | undefined;
      if (!userId) {
        return reply.status(401).send({ error: "사용자 인증이 필요합니다." });
      }
      const ticket = sseTicketManager.issue(userId);
      return reply.send({ ticket });
    }
  );

  app.post(
    "/api/workflow/execute",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      // ... existing execute logic
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          return reply.status(401).send({ error: "사용자 인증이 필요합니다." });
        }

        const { prompt, chatHistory, projectId } = request.body as {
          prompt: string;
          chatHistory: any[];
          projectId?: string;
        };

        if (!prompt) {
          return reply.status(400).send({ error: "Prompt is required." });
        }

        const result = await orchestratorService.handleRequest(
          prompt,
          { id: userId },
          chatHistory || [],
          projectId
        );

        return reply.send(result);
      } catch (error: any) {
        app.log.error(error, "Error in orchestrator service");
        return reply.status(500).send({
          error: "Failed to handle request.",
          details: error.message,
        });
      }
    }
  );

  app.post(
    "/api/workflow/run",
    // {
    //   preHandler: [app.authenticateToken],
    // },
    async (request, reply) => {
      // ... existing run logic
      try {
        const userId =
          ((request as any).userId as string | undefined) || "test-user-id";
        // if (!userId) {
        //   return reply.status(401).send({ error: "사용자 인증이 필요합니다." });
        // }

        const { plan, projectId } = request.body as {
          plan: any;
          projectId?: string;
        };

        if (!plan) {
          return reply.status(400).send({ error: "A valid plan is required." });
        }

        const result = await workflowService.executePlan(
          plan,
          { id: userId },
          projectId
        );

        const msg =
          "프로젝트 생성이 완료되었습니다! 파일 트리에서 결과를 확인하세요.";
        return reply.send({
          type: "WORKFLOW_RESULT",
          payload: {
            ...result,
            summaryMessage: msg,
          },
        });
      } catch (error: any) {
        app.log.error(error, "Error in workflow execution");
        return reply.status(500).send({
          error: "Failed to execute workflow.",
          details: error.message,
        });
      }
    }
  );
}
