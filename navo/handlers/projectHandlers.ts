import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { getUserIdFromToken } from '../auth/auth.js';
import { projects, pages, publishDeploys } from '../db/schema.js';
import { and, desc, eq } from 'drizzle-orm';

export async function handleListProjects(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));

    res.json({ projects: rows });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
}

export async function handleListProjectPages(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;

    // Verify project ownership
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
      .limit(1);

    if (!project[0]) {
      return res
        .status(404)
        .json({ error: 'Project not found or unauthorized' });
    }

    const pageRows = await db
      .select({ id: pages.id, path: pages.path, updated_at: pages.updatedAt })
      .from(pages)
      .where(eq(pages.projectId, projectId))
      .orderBy(pages.updatedAt);

    res.json({ pages: pageRows });
  } catch (error) {
    console.error('Error listing project pages:', error);
    res.status(500).json({ error: 'Failed to list project pages' });
  }
}

export async function handleGetPageLayout(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pageId } = req.params;

    const page = await db
      .select({ layout_json: pages.layoutJson, projectId: pages.projectId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page[0]) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Verify page ownership through project owner_id
    const proj = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, page[0].projectId))
      .limit(1);

    if (!proj[0] || proj[0].ownerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not own this page' });
    }

    res.json({ layout: page[0].layout_json });
  } catch (error) {
    console.error('Error getting page layout:', error);
    res.status(500).json({ error: 'Failed to get page layout' });
  }
}

export async function handleRollback(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;
    const { rollbackTo } = req.body; // Can be a deploymentId or an index (0 for latest, 1 for second latest, etc.)

    // Verify project ownership
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
      .limit(1);

    if (!project[0]) {
      return res
        .status(404)
        .json({ error: 'Project not found or unauthorized' });
    }

    let targetDeploymentId: string | undefined;

    if (typeof rollbackTo === 'string') {
      // Assume rollbackTo is a direct vercelDeploymentId
      const deployment = await db.query.publishDeploys.findFirst({
        where: and(
          eq(publishDeploys.projectId, projectId),
          eq(publishDeploys.vercelDeploymentId, rollbackTo)
        ),
      });
      targetDeploymentId = deployment?.vercelDeploymentId ?? undefined;
    } else if (typeof rollbackTo === 'number') {
      // Assume rollbackTo is an index (0 for latest, 1 for second latest, etc.)
      const deployments = await db.query.publishDeploys.findMany({
        where: eq(publishDeploys.projectId, projectId),
        orderBy: desc(publishDeploys.createdAt),
        limit: rollbackTo + 1, // Fetch enough deployments to get the one at the specified index
      });

      if (deployments.length > rollbackTo) {
        targetDeploymentId =
          deployments[rollbackTo].vercelDeploymentId ?? undefined;
      }
    }

    if (!targetDeploymentId) {
      return res
        .status(400)
        .json({ error: 'Invalid rollback target or deployment not found.' });
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

    res.json({
      ok: true,
      message: `Rollback initiated for deployment ID: ${targetDeploymentId}`,
      // stdout: stdout, // In a real scenario
      // stderr: stderr, // In a real scenario
    });
  } catch (error) {
    console.error('Error performing rollback:', error);
    res.status(500).json({ error: 'Failed to perform rollback' });
  }
}
