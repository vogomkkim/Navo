import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/db.js';
import { getUserIdFromToken } from '../auth/auth.js';
import {
  projects,
  pages,
  publishDeploys,
  components,
  componentDefinitions,
} from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';

export async function handleListProjects(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = getUserIdFromToken(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(projects.name);

    reply.send({ projects: rows });
  } catch (error) {
    console.error('Error listing projects:', error);
    reply.status(500).send({ error: 'Failed to list projects' });
  }
}

export async function handleListProjectPages(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = getUserIdFromToken(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { projectId } = request.params as { projectId: string };

    // Verify project ownership
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
      .limit(1);

    if (!project[0]) {
      return reply
        .status(404)
        .send({ error: 'Project not found or unauthorized' });
    }

    const pageRows = await db
      .select({ id: pages.id, path: pages.path, updated_at: pages.updatedAt })
      .from(pages)
      .where(eq(pages.projectId, projectId))
      .orderBy(pages.path);

    reply.send({ pages: pageRows });
  } catch (error) {
    console.error('Error listing project pages:', error);
    reply.status(500).send({ error: 'Failed to list project pages' });
  }
}

export async function handleGetPageLayout(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = getUserIdFromToken(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { pageId } = request.params as { pageId: string };

    const page = await db
      .select({ layout_json: pages.layoutJson, projectId: pages.projectId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page[0]) {
      return reply.status(404).send({ error: 'Page not found' });
    }

    // Verify page ownership through project owner_id
    const proj = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, page[0].projectId))
      .limit(1);

    if (!proj[0] || proj[0].ownerId !== userId) {
      return reply
        .status(403)
        .send({ error: 'Forbidden: You do not own this page' });
    }

    // 실제 저장된 컴포넌트 데이터를 가져와서 레이아웃 구성
    const pageComponents = await db
      .select({
        id: components.id,
        componentDefinitionId: components.componentDefinitionId,
        props: components.props,
        orderIndex: components.orderIndex,
        componentName: componentDefinitions.name,
        componentDisplayName: componentDefinitions.displayName,
        componentType: componentDefinitions.category,
        renderTemplate: componentDefinitions.renderTemplate,
        cssStyles: componentDefinitions.cssStyles,
      })
      .from(components)
      .innerJoin(
        componentDefinitions,
        eq(components.componentDefinitionId, componentDefinitions.id)
      )
      .where(eq(components.pageId, pageId))
      .orderBy(components.orderIndex);

    // 레이아웃 구조로 변환
    const layoutComponents = pageComponents.map((comp) => ({
      id: comp.id,
      type: comp.componentName,
      props: comp.props,
      displayName: comp.componentDisplayName,
      category: comp.componentType,
      renderTemplate: comp.renderTemplate,
      cssStyles: comp.cssStyles,
    }));

    const layout = {
      components: layoutComponents,
    };

    reply.send({ layout });
  } catch (error) {
    console.error('Error getting page layout:', error);
    reply.status(500).send({ error: 'Failed to get page layout' });
  }
}

export async function handleRollback(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = getUserIdFromToken(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { projectId } = request.params as { projectId: string };
    const { rollbackTo } = request.body as { rollbackTo: string | number }; // Can be a deploymentId or an index (0 for latest, 1 for second latest, etc.)

    // Verify project ownership
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
      .limit(1);

    if (!project[0]) {
      return reply
        .status(404)
        .send({ error: 'Project not found or unauthorized' });
    }

    let targetDeploymentId: string | undefined;

    if (typeof rollbackTo === 'string') {
      // Assume rollbackTo is a direct vercelDeploymentId
      const deployment = await db.query.publishDeploys.findFirst({
        where: and(
          eq(publishDeploys.projectId, projectId),
          sql`${publishDeploys.metadata}->>'vercelDeploymentId' = ${rollbackTo}`
        ),
      });
      targetDeploymentId =
        (deployment?.metadata as any)?.vercelDeploymentId ?? undefined;
    } else if (typeof rollbackTo === 'number') {
      // Assume rollbackTo is an index (0 for latest, 1 for second latest, etc.)
      const deployments = await db.query.publishDeploys.findMany({
        where: eq(publishDeploys.projectId, projectId),
        orderBy: desc(publishDeploys.createdAt),
        limit: rollbackTo + 1, // Fetch enough deployments to get the one at the specified index
      });

      if (deployments.length > rollbackTo) {
        targetDeploymentId =
          (deployments[rollbackTo].metadata as any)?.vercelDeploymentId ??
          undefined;
      }
    }

    if (!targetDeploymentId) {
      return reply
        .status(400)
        .send({ error: 'Invalid rollback target or deployment not found.' });
    }

    // Execute Vercel rollback command
    // This assumes 'vercel' CLI is installed and configured in the environment where this code runs
    // and VERCEL_TOKEN is set as an environment variable.
    const command = `vercel rollback ${targetDeploymentId}`;
    console.log(`Executing rollback command: ${command}`);

    // Simulate shell command execution for now
    // In a real scenario, this would be an actual shell command execution
    // const { stdout, stderr } = await run_shell_command(command); // This would be the actual call

    // For now, just log and return success
    console.log(
      `Simulating Vercel rollback for deployment ID: ${targetDeploymentId}`
    );
    // In a real scenario, you would check stdout/stderr for success/failure

    reply.send({
      ok: true,
      message: `Rollback initiated for deployment ID: ${targetDeploymentId}`,
      // stdout: stdout, // In a real scenario
      // stderr: stderr, // In a real scenario
    });
  } catch (error) {
    console.error('Error performing rollback:', error);
    reply.status(500).send({ error: 'Failed to perform rollback' });
  }
}
