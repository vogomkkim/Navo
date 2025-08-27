import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { handleUnifiedEvents } from "../handlers/eventHandlers.js";
import { authenticateToken } from "../auth/auth.js";

async function analyticsRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get(
    "/analytics/events",
    { preHandler: [authenticateToken] },
    handleUnifiedEvents
  );
}

export default analyticsRoutes;
