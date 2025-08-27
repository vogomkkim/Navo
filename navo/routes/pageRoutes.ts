import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { handleGetPageLayout } from "../handlers/projectHandlers.js";
import { authenticateToken } from "../auth/auth.js";

async function pageRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get(
    "/pages/:pageId",
    { preHandler: [authenticateToken] },
    handleGetPageLayout
  );
}

export default pageRoutes;
