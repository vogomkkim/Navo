import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { pages, projects } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { AuthenticatedRequest } from '../auth/auth.js'; // Import AuthenticatedRequest

interface PageLayout {
  components: Array<{
    id: string;
    type: string;
    props: Record<string, any>;
  }>;
}

export async function handleDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
  const startTime = process.hrtime.bigint();
  try {
    const userId = req.userId; // Get userId from the authenticated request

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User ID not found' });
      return;
    }

    // Dynamically determine projectId based on userId
    const userProject = await db.query.projects.findFirst({
      where: eq(projects.ownerId, userId),
    });

    if (!userProject) {
      res.status(404).json({ error: 'No project found for this user' });
      return;
    }

    const projectId = userProject.id;
    const pagePath = '/'; // Placeholder Page Path (e.g., homepage) - still hardcoded for now

    const page = await db.query.pages.findFirst({
      where: and(eq(pages.projectId, projectId), eq(pages.path, pagePath)),
    });

    let layout: PageLayout; // Declare layout with the new interface
    if (page) {
      layout = page.layoutJson as PageLayout; // Cast to PageLayout
    } else {
      // If no page found, return a default empty layout or an initial template
      layout = {
        components: [
          {
            id: 'default-c1',
            type: 'Header',
            props: { title: 'Welcome to Navo (Default)', subtitle: 'AI-Powered Web Builder' },
          },
          {
            id: 'default-c2',
            type: 'Hero',
            props: { headline: 'Build Amazing Websites (Default)', cta: 'Get Started' },
          },
        ],
      };
    }

    const endTime = process.hrtime.bigint();
    const tookMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    res.json({
      ok: true,
      draft: {
        id: page?.id || 'default-draft-id',
        layout: layout,
        lastModified: page?.updatedAt?.toISOString() || new Date().toISOString(),
      },
      tookMs: tookMs,
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
}

export async function handleSave(req: Request, res: Response): Promise<void> {
  try {
    const { layout } = req.body;

    if (!layout) {
      res.status(400).json({ error: 'Layout is required' });
      return;
    }

    // For now, just log the save operation
    // TODO: Implement actual draft saving to database
    console.log('Saving draft layout:', layout);

    res.json({
      ok: true,
      message: 'Draft saved successfully',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
}