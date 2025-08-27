import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  handleHealthCheck,
  handleDbTest,
} from "../handlers/healthAndDbTestHandlers.js";

async function healthRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.get("/health", handleHealthCheck);
  fastify.get("/health/db-test", handleDbTest);
}

export default healthRoutes;
