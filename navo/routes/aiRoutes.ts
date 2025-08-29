import { FastifyInstance } from "fastify";
import { authenticateToken } from "../auth/auth.js";
import { handleMultiAgentChat } from "../handlers/aiHandlers.js";
import { handleVirtualPreview } from "../handlers/aiHandlers.js";

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

  // 가상 파일 미리보기
  fastify.get(
    "/preview/:pageId/*",
    { preHandler: [authenticateToken] },
    handleVirtualPreview
  );
}
