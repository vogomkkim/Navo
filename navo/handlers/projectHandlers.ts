import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { getUserIdFromToken } from '../auth/auth.js';
import { projects, pages } from '../db/schema.js';
import { and, desc, eq } from 'drizzle-orm';

export async function handleListProjects(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rows = await db
      .select({ id: projects.id, name: projects.name, createdAt: projects.createdAt })
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
