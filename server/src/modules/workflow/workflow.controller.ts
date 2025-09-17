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
    const { projectId, ticket } = request.query as { projectId: string; ticket?: string };

    if (!ticket) {
      return reply.code(401).send("Authentication ticket is missing.");
    }

    const verification = sseTicketManager.verify(ticket);
    if (!verification) {
      return reply.code(401).send("Invalid or expired authentication ticket.");
    }
    
    // Optional but recommended: Check if verification.userId has access to projectId
    // For now, we'll assume the ticket grants access.

    const origin = request.headers.origin as string | undefined;
    const allowedDevOrigin = "http://localhost:3000";
    const allowedProdOrigin = process.env.WS_ALLOWED_ORIGIN;

    if (process.env.NODE_ENV === "development") {
      if (origin && origin !== allowedDevOrigin) {
        reply.code(403).send("Origin not allowed");
        return;
      }
    } else if (allowedProdOrigin) {
      if (origin && origin !== allowedProdOrigin) {
        reply.code(403).send("Origin not allowed");
        return;
      }
    }

    const { projectId } = request.params as { projectId: string };
    if (!projectId) {
      reply.code(400).send("projectId required");
      return;
    }

    reply.header("Content-Type", "text/event-stream");
    reply.header("Cache-Control", "no-cache");
    reply.header("Connection", "keep-alive");
    if (origin) reply.header("Access-Control-Allow-Origin", origin);

    // Initial comment to establish stream
    reply.raw.write(":ok\n\n");

    connectionManager.addSse(projectId, reply.raw);

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(":heartbeat\n\n");
      } catch {
        // ignore
      }
    }, 25000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      connectionManager.removeSse(projectId, reply.raw);
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
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      // ... existing run logic
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          return reply.status(401).send({ error: "사용자 인증이 필요합니다." });
        }

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
