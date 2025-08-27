import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { handleDraft, handleSave } from "../handlers/draftHandlers.js";
import { authenticateToken } from "../auth/auth.js";

async function draftRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get("/draft", { preHandler: [authenticateToken] }, handleDraft);
  fastify.post("/draft/save", { preHandler: [authenticateToken] }, handleSave);
}

export default draftRoutes;
