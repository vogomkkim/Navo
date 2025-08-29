import { FastifyInstance } from "fastify";
import { authenticateToken } from "../middleware/auth.js";
import { handleMultiAgentChat } from "../handlers/aiHandlers.js";
import { handleVirtualPreview } from "../handlers/aiHandlers.js";
import { db } from "../db/db.js";
import { pages } from "../db/schema.js";
import { eq } from "drizzle-orm";

export default async function aiRoutes(fastify: FastifyInstance) {
  // AI 멀티 에이전트 채팅
  fastify.post(
    "/ai/chat",
    { preHandler: [authenticateToken] },
    handleMultiAgentChat
  );

  // AI 제안 생성
  fastify.post(
    "/ai/suggest",
    { preHandler: [authenticateToken] },
    async (request, reply) => {
      try {
        // TODO: Implement AI suggestion generation
        reply.send({ message: "AI suggestion endpoint" });
      } catch (error) {
        reply.status(500).send({ error: "AI suggestion failed" });
      }
    }
  );

  // 가상 프로젝트 미리보기
  fastify.get(
    "/preview/:pageId/*",
    { preHandler: [authenticateToken] },
    async (request, reply) => {
      try {
        const pageId = (request.params as any).pageId as string;
        const result = await db
          .select()
          .from(pages)
          .where(eq(pages.id, pageId));

        if (result.length === 0) {
          reply.status(404).send("Page not found");
          return;
        }

        const page = result[0];
        reply.type("application/json").send(page.layoutJson);
      } catch (error) {
        reply.status(500).send({ error: "Failed to fetch page" });
      }
    }
  );

  // 가상 파일 미리보기
  fastify.get("/preview/:pageId/*", handleVirtualPreview);
}
