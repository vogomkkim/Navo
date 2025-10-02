import { FastifyInstance } from "fastify";
import { ProjectsService } from "./projects.service";
import { WorkflowService } from "@/modules/workflow/workflow.service";

export function projectsController(app: FastifyInstance) {
  const projectsService = new ProjectsService(app);
  const workflowService = new WorkflowService(app);

  // --- Chat Endpoints ---

  app.get(
    "/api/projects/:projectId/messages",
    { preHandler: [app.authenticateToken] },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const { cursor, limit = 20 } = request.query as {
          cursor?: string;
          limit?: number;
        };
        const userId = (request as any).userId;

        const messages = await projectsService.getMessages(projectId, userId, {
          cursor,
          limit,
        });

        app.log.info({ messagesToClient: messages }, "Sending messages to client");

        reply.send(messages);
      } catch (error) {
        app.log.error(error, "메시지 조회 실패");
        reply.status(500).send({ error: "메시지 조회에 실패했습니다." });
      }
    }
  );

  app.post(
    "/api/projects/:projectId/messages",
    { preHandler: [app.authenticateToken] },
    async (request, reply) => {
      try {
        let { projectId } = request.params as { projectId: string };
        const { prompt, chatHistory, context } = request.body as {
          prompt: string;
          chatHistory: any[];
          context: any;
        };
        const userId = (request as any).userId;

        if (!prompt) {
          return reply.status(400).send({ error: "Prompt is required." });
        }

        // Handle "new" project creation
        if (projectId === "new") {
          // Create a new project first
          const newProject = await projectsService.createProject(
            {
              name: `AI 프로젝트 - ${new Date().toLocaleTimeString()}`,
              description: prompt.substring(0, 200), // Use first 200 chars as description
              organizationId: await projectsService.getUserOrganizationId(userId),
              requirements: prompt,
            },
            userId
          );
          projectId = newProject.id;
          app.log.info({ projectId, userId }, "New project created from message");
        }

        // 1. Save user's message to DB
        await projectsService.createMessage(
          projectId,
          userId,
          {
            role: "user",
            content: prompt,
          }
        );

        // 2. Immediately trigger the workflow and return a workflow ID for tracking
        const workflowResponse = await workflowService.createAndRunWorkflow({
          projectId,
          userId,
          prompt,
          chatHistory,
          context,
        });

        // 3. Return the appropriate response based on the workflow decision
        // Include projectId in all responses for new project case
        const responseWithProjectId = {
          ...workflowResponse,
          projectId, // Add projectId to response
        };

        if (workflowResponse.type === 'EXECUTION_STARTED') {
          return reply.status(202).send(responseWithProjectId);
        } else {
          // For PROPOSAL_REQUIRED or ERROR
          return reply.status(200).send(responseWithProjectId);
        }

      } catch (error: any) {
        app.log.error(error, "Error in workflow service");
        return reply.status(500).send({
          error: "Failed to handle request.",
          details: error.message,
        });
      }
    }
  );

  // List projects
  app.get(
    "/api/projects",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const projects = await projectsService.listProjects(userId);
        reply.send({ projects });
      } catch (error) {
        app.log.error(error, "프로젝트 목록 조회 실패");
        reply.status(500).send({ error: "프로젝트 목록 조회에 실패했습니다." });
      }
    }
  );

  // Get project details
  app.get(
    "/api/projects/:projectId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const { projectId } = request.params as { projectId: string };
        const project = await projectsService.getProject(projectId, userId);

        if (!project) {
          reply.status(404).send({ error: "프로젝트를 찾을 수 없습니다." });
          return;
        }

        reply.send(project);
      } catch (error) {
        app.log.error(error, "프로젝트 조회 실패");
        reply.status(500).send({ error: "프로젝트 조회에 실패했습니다." });
      }
    }
  );

  // Get the entire VFS tree for a project
  app.get(
    "/api/projects/:projectId/vfs",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const query = request.query as any;
        const includeContent = query.includeContent === "true";
        const paths = query.paths
          ? (query.paths as string).split(",")
          : undefined;

        const vfsTree = await projectsService.getVfsTree(projectId, userId, {
          includeContent,
          paths,
        });

        const etag = vfsTree.version;
        if (request.headers["if-none-match"] === etag) {
          return reply.status(304).send();
        }

        reply.header("ETag", etag);
        reply.send(vfsTree);
      } catch (error) {
        app.log.error(error, "프로젝트 VFS 트리 조회 실패");
        reply
          .status(500)
          .send({ error: "프로젝트 VFS 트리 조회에 실패했습니다." });
      }
    }
  );

  // Get a single VFS node by ID
  app.get(
    "/api/projects/:projectId/vfs/:nodeId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;

        const node = await projectsService.getVfsNode(
          nodeId,
          projectId,
          userId
        );

        if (!node) {
          return reply
            .status(404)
            .send({ error: "파일 또는 디렉토리를 찾을 수 없습니다." });
        }

        reply.send({ node });
      } catch (error) {
        app.log.error(error, "VFS 노드 조회 실패");
        reply.status(500).send({ error: "VFS 노드 조회에 실패했습니다." });
      }
    }
  );

  // Get VFS nodes by parent ID
  app.get(
    "/api/projects/:projectId/vfs/nodes/:parentId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const { projectId, parentId } = params;
        const parentIdParam = parentId === "null" ? null : parentId;

        const nodes = await projectsService.listProjectVfsNodes(
          projectId,
          parentIdParam,
          userId
        );

        reply.send({ nodes });
      } catch (error) {
        app.log.error(error, "VFS 노드 목록 조회 실패");
        reply.status(500).send({ error: "VFS 노드 목록 조회에 실패했습니다." });
      }
    }
  );

  // Update a VFS node's content
  app.patch(
    "/api/projects/:projectId/vfs/:nodeId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;
        const { content } = request.body as { content: string };

        if (typeof content !== "string") {
          return reply.status(400).send({ error: "Content must be a string." });
        }

        const updatedNode = await projectsService.updateVfsNodeContent(
          nodeId,
          projectId,
          userId,
          content
        );

        if (!updatedNode) {
          return reply.status(404).send({ error: "파일을 찾을 수 없습니다." });
        }

        reply.send({ node: updatedNode });
      } catch (error) {
        app.log.error(error, "VFS 노드 내용 업데이트 실패");
        reply
          .status(500)
          .send({ error: "VFS 노드 내용 업데이트에 실패했습니다." });
      }
    }
  );

  // Create a new VFS node (file or directory)
  app.post(
    "/api/projects/:projectId/vfs",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const body = request.body as any;
        const {
          parentId = null,
          nodeType,
          name,
          content,
          metadata,
        } = body ?? {};

        if (!name || typeof name !== "string") {
          reply.status(400).send({ error: "유효한 이름이 필요합니다." });
          return;
        }
        if (nodeType !== "FILE" && nodeType !== "DIRECTORY") {
          reply
            .status(400)
            .send({ error: "nodeType은 FILE 또는 DIRECTORY 여야 합니다." });
          return;
        }

        const node = await projectsService.createVfsNode(projectId, userId, {
          parentId,
          nodeType,
          name,
          content,
          metadata,
        });
        reply.send({ node });
      } catch (error: any) {
        app.log.error(error, "VFS 노드 생성 실패");
        reply
          .status(500)
          .send({ error: error.message ?? "VFS 노드 생성에 실패했습니다." });
      }
    }
  );

  // Rename or Move a VFS node (operation provided in body)
  app.patch(
    "/api/projects/:projectId/vfs/:nodeId/ops",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;
        const body = request.body as any;
        const { op, newName, newParentId } = body ?? {};

        if (op === "rename") {
          if (!newName || typeof newName !== "string") {
            reply.status(400).send({ error: "newName이 필요합니다." });
            return;
          }
          const node = await projectsService.renameVfsNode(projectId, userId, {
            nodeId,
            newName,
          });
          if (!node) {
            reply
              .status(404)
              .send({ error: "파일 또는 디렉토리를 찾을 수 없습니다." });
            return;
          }
          reply.send({ node });
          return;
        }

        if (op === "move") {
          const node = await projectsService.moveVfsNode(projectId, userId, {
            nodeId,
            newParentId: newParentId ?? null,
          });
          if (!node) {
            reply
              .status(404)
              .send({ error: "파일 또는 디렉토리를 찾을 수 없습니다." });
            return;
          }
          reply.send({ node });
          return;
        }

        reply
          .status(400)
          .send({ error: "지원되지 않는 op 입니다. (rename|move)" });
      } catch (error) {
        app.log.error(error, "VFS 노드 변경 실패");
        reply.status(500).send({ error: "VFS 노드 변경에 실패했습니다." });
      }
    }
  );

  // Delete a VFS node
  app.delete(
    "/api/projects/:projectId/vfs/:nodeId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const { projectId, nodeId } = params;

        const ok = await projectsService.deleteVfsNode(projectId, userId, {
          nodeId,
        });
        reply.send({ success: ok });
      } catch (error) {
        app.log.error(error, "VFS 노드 삭제 실패");
        reply.status(500).send({ error: "VFS 노드 삭제에 실패했습니다." });
      }
    }
  );

  // Find a VFS node by path
  app.get(
    "/api/projects/:projectId/vfs/by-path",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const query = request.query as any;
        const path = (query.path as string) ?? "";

        const node = await projectsService.findVfsNodeByPath(
          projectId,
          userId,
          path
        );
        if (!node) {
          reply
            .status(404)
            .send({ error: "경로에 해당하는 노드를 찾을 수 없습니다." });
          return;
        }
        reply.send({ node });
      } catch (error) {
        app.log.error(error, "경로 기반 VFS 노드 조회 실패");
        reply
          .status(500)
          .send({ error: "경로 기반 VFS 노드 조회에 실패했습니다." });
      }
    }
  );

  // Upsert a VFS node's content by path
  app.patch(
    "/api/projects/:projectId/vfs/by-path",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const body = request.body as any;
        const { path, content } = body ?? {};

        if (!path || typeof path !== "string") {
          reply.status(400).send({ error: "유효한 path가 필요합니다." });
          return;
        }
        if (typeof content !== "string") {
          reply.status(400).send({ error: "Content must be a string." });
          return;
        }

        const node = await projectsService.upsertVfsNodeByPath(
          projectId,
          userId,
          path,
          content
        );
        reply.send({ node });
      } catch (error: any) {
        app.log.error(error, "경로 기반 VFS 노드 업서트 실패");
        reply
          .status(500)
          .send({
            error: error.message ?? "경로 기반 VFS 노드 업서트에 실패했습니다.",
          });
      }
    }
  );

  // Apply a textual patch to a VFS node by path (auto-create)
  app.patch(
    "/api/projects/:projectId/vfs/by-path/diff",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const body = request.body as any;
        const { path, patch, options } = body ?? {};

        if (!path || typeof path !== "string") {
          reply.status(400).send({ error: "유효한 path가 필요합니다." });
          return;
        }
        if (
          !(
            typeof patch === "string" ||
            (patch && typeof patch.find === "string")
          )
        ) {
          reply
            .status(400)
            .send({
              error:
                "patch는 dmp 문자열 또는 { find, replace } 객체여야 합니다.",
            });
          return;
        }

        const node = await projectsService.applyPatchVfsNodeByPath(
          projectId,
          userId,
          path,
          patch,
          options
        );
        reply.send({ node });
      } catch (error: any) {
        app.log.error(error, "경로 기반 VFS 노드 패치 적용 실패");
        reply
          .status(500)
          .send({
            error:
              error.message ?? "경로 기반 VFS 노드 패치 적용에 실패했습니다.",
          });
      }
    }
  );

  // Rename project
  app.patch(
    "/api/projects/:projectId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;
        const body = request.body as any;
        const { name } = body;

        if (!name || typeof name !== "string" || name.trim().length < 2) {
          reply.status(400).send({
            error: "유효하지 않은 이름입니다. 최소 2자 이상 입력해주세요.",
          });
          return;
        }

        const project = await projectsService.renameProject(
          projectId,
          name,
          userId
        );
        reply.send({ project });
      } catch (error) {
        app.log.error(error, "프로젝트 이름 변경 실패");
        reply.status(500).send({ error: "프로젝트 이름 변경에 실패했습니다." });
      }
    }
  );

  // Delete project
  app.delete(
    "/api/projects/:projectId",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        await projectsService.deleteProject(projectId, userId);
        reply.send({ success: true });
      } catch (error) {
        app.log.error(error, "프로젝트 삭제 실패");
        reply.status(500).send({ error: "프로젝트 삭제에 실패했습니다." });
      }
    }
  );

  // Rollback project
  app.post(
    "/api/projects/:projectId/rollback",
    {
      preHandler: [app.authenticateToken],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).userId as string | undefined;
        if (!userId) {
          reply.status(401).send({ error: "사용자 인증이 필요합니다." });
          return;
        }

        const params = request.params as any;
        const projectId = params.projectId as string;

        const result = await projectsService.rollbackProject(projectId, userId);
        reply.send({ success: true, result });
      } catch (error) {
        app.log.error(error, "프로젝트 롤백 실패");
        reply.status(500).send({ error: "프로젝트 롤백에 실패했습니다." });
      }
    }
  );
}
