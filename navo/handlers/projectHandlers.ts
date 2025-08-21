import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { getUserIdFromToken } from '../auth/auth.js';

export async function handleListProjects(req: Request, res: Response) {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projects = await prisma.project.findMany({
      where: { owner_id: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
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
    const project = await prisma.project.findUnique({
      where: { id: projectId, owner_id: userId },
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: 'Project not found or unauthorized' });
    }

    const pages = await prisma.pages.findMany({
      where: { project_id: projectId },
      select: {
        id: true,
        path: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'asc' },
    });

    res.json({ pages });
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

    const page = await prisma.pages.findUnique({
      where: { id: pageId },
      select: {
        layout_json: true,
        projects: {
          select: {
            owner_id: true,
          },
        },
      },
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Verify page ownership through project owner_id
    if (page.projects.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not own this page' });
    }

    res.json({ layout: page.layout_json });
  } catch (error) {
    console.error('Error getting page layout:', error);
    res.status(500).json({ error: 'Failed to get page layout' });
  }
}
