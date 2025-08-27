import { FastifyInstance } from "fastify";
import logger from "../core/logger.js";
import aiRoutes from "./aiRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import authRoutes from "./authRoutes.js";
import componentRoutes from "./componentRoutes.js";
import draftRoutes from "./draftRoutes.js";
import eventRoutes from "./eventRoutes.js";
import healthRoutes from "./healthRoutes.js";
import pageRoutes from "./pageRoutes.js";
import projectRoutes from "./projectRoutes.js";

export function setupApiRoutes(app: FastifyInstance) {
  // Health routes (no authentication required)
  app.register(healthRoutes);

  // API routes (with authentication)
  app.register(aiRoutes, { prefix: "/api" });
  app.register(analyticsRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(componentRoutes, { prefix: "/api" });
  app.register(draftRoutes, { prefix: "/api" });
  app.register(eventRoutes, { prefix: "/api" });
  app.register(pageRoutes, { prefix: "/api" });
  app.register(projectRoutes, { prefix: "/api" });
  logger.info("API routes initialized");
}
