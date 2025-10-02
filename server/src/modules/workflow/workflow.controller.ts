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

import { proposalStore } from "./proposalStore/inMemoryStore";

export function workflowController(app: FastifyInstance) {
  const orchestratorService = new OrchestratorService(app);
  const workflowService = new WorkflowService(app);

  // SSE route (server -> client events)
  app.get(
    "/api/sse/projects/:projectId",
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { ticket } = request.query as { ticket?: string };

      if (!ticket) {
        return reply.status(401).send({ error: "Missing ticket" });
      }

      const verifiedUser = sseTicketManager.verify(ticket);
      if (!verifiedUser) {
        return reply.status(403).send({ error: "Invalid or expired ticket" });
      }

      // Set SSE headers (including CORS)
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // For nginx
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
      });

      // Add connection to manager
      connectionManager.addSse(projectId, reply.raw);

      // Send initial connection event
      reply.raw.write(`data: ${JSON.stringify({ type: "connected", projectId })}\n\n`);

      // Handle client disconnect
      request.raw.on("close", () => {
        connectionManager.removeSse(projectId, reply.raw);
        app.log.info({ projectId, userId: verifiedUser.userId }, "SSE connection closed");
      });

      app.log.info({ projectId, userId: verifiedUser.userId }, "SSE connection established");
    }
  );

  // Route to issue a one-time ticket for SSE authentication
  app.post(
    "/api/sse/ticket",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const ticket = sseTicketManager.issue(userId);
      return reply.send({ ticket });
    }
  );

  // New primary entry point for user messages
  app.post(
    "/api/projects/:projectId/workflow/message",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string;
        const { projectId } = request.params as { projectId: string };
        const { prompt, chatHistory, context } = request.body as {
          prompt: string;
          chatHistory: any[];
          context: any; // Define MessageContext type here if needed
        };

        if (!prompt) {
          return reply.status(400).send({ error: "Prompt is required." });
        }

        const workflowResponse = await workflowService.createAndRunWorkflow({
          projectId,
          userId,
          prompt,
          chatHistory: chatHistory || [],
          context,
        });

        if (workflowResponse.type === 'EXECUTION_STARTED') {
          return reply.status(202).send(workflowResponse);
        } else {
          return reply.status(200).send(workflowResponse);
        }

      } catch (error: any) {
        app.log.error(error, "Error in workflow service");
        return reply.status(500).send({
          type: 'ERROR',
          errorCode: 'WORKFLOW_CREATION_FAILED',
          message: error.message || "Failed to create or run workflow.",
          retryable: false,
        });
      }
    }
  );

  // New endpoint to approve a proposal and start execution
  app.post(
    "/api/projects/:projectId/workflow/approve-proposal",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { proposalId } = request.body as { proposalId: string };
      const userId = (request as any).userId as string;

      try {
        const proposal = await proposalStore.get(proposalId);

        if (!proposal) {
          return reply.status(404).send({ type: 'ERROR', errorCode: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or expired', retryable: false });
        }

        if (proposal.userId !== userId || proposal.projectId !== projectId) {
          return reply.status(403).send({ type: 'ERROR', errorCode: 'UNAUTHORIZED', message: 'You are not authorized to approve this proposal.', retryable: false });
        }

        const result = await workflowService.executePlan(proposal.plan, { id: userId }, projectId);

        await proposalStore.delete(proposalId);

        // This needs to be adapted to the new SSE ticket flow
        // For now, let's assume executePlan will return what's needed
        // This part will require careful integration with the SSE ticket logic
        const ticket = sseTicketManager.issue(userId);
        const sseUrl = `/api/sse/projects/${projectId}?ticket=${ticket}`;

        return reply.send({
          type: 'EXECUTION_STARTED',
          runId: result.runId, // Assuming executePlan returns a runId
          sseUrl: sseUrl,
          planSummary: {
            name: proposal.plan.name,
            description: proposal.plan.description,
            steps: proposal.plan.steps.map(s => ({ id: s.id, title: s.title, description: s.description, tool: s.tool })),
            estimatedDuration: proposal.plan.estimatedDuration || 0,
          },
        });

      } catch (error: any) {
        app.log.error(error, "Failed to approve proposal");
        return reply.status(500).send({
          type: 'ERROR',
          errorCode: 'APPROVAL_FAILED',
          message: 'Failed to start execution after approval.',
          retryable: true,
        });
      }
    }
  );

  // New endpoint to reject a proposal
  app.post(
    "/api/projects/:projectId/workflow/reject-proposal",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      const { proposalId } = request.body as { proposalId: string };
      const userId = (request as any).userId as string;

      try {
        const proposal = await proposalStore.get(proposalId);
        if (proposal && proposal.userId === userId) {
          await proposalStore.delete(proposalId);
        }
        return reply.status(200).send({ success: true });
      } catch (error: any) {
        app.log.error(error, "Failed to reject proposal");
        return reply.status(500).send({ success: false });
      }
    }
  );
}
