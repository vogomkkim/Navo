import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  handleGetComponentDefinitions,
  handleGetComponentDefinition,
  handleSeedComponentDefinitions,
  handleCreateComponentDefinition,
  handleUpdateComponentDefinition,
  handleDeleteComponentDefinition,
  handleGenerateComponentFromNaturalLanguage,
} from "../handlers/componentHandlers.js";
import { authenticateToken } from "../auth/auth.js";

async function componentRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get(
    "/components",
    { preHandler: [authenticateToken] },
    handleGetComponentDefinitions
  );
  fastify.get(
    "/components/:name",
    { preHandler: [authenticateToken] },
    handleGetComponentDefinition
  );
  fastify.post(
    "/components/seed",
    { preHandler: [authenticateToken] },
    handleSeedComponentDefinitions
  );
  fastify.post(
    "/components",
    { preHandler: [authenticateToken] },
    handleCreateComponentDefinition
  );
  fastify.post(
    "/components/generate",
    { preHandler: [authenticateToken] },
    handleGenerateComponentFromNaturalLanguage
  );
  fastify.put(
    "/components/:id",
    { preHandler: [authenticateToken] },
    handleUpdateComponentDefinition
  );
  fastify.delete(
    "/components/:id",
    { preHandler: [authenticateToken] },
    handleDeleteComponentDefinition
  );
}

export default componentRoutes;
