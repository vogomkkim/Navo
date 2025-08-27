import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  handleListProjects,
  handleListProjectPages,
  handleRollback,
} from "../handlers/projectHandlers.js";
import { authenticateToken } from "../auth/auth.js";

async function projectRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get(
    "/projects",
    { preHandler: [authenticateToken] },
    handleListProjects
  );
  fastify.get(
    "/projects/:projectId/pages",
    { preHandler: [authenticateToken] },
    handleListProjectPages
  );
  fastify.post(
    "/projects/:projectId/rollback",
    { preHandler: [authenticateToken] },
    handleRollback
  );
}

export default projectRoutes;
