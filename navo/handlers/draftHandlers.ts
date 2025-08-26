import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/db.js';
import { pages, projects } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

interface PageLayout {
  components: Array<{
    id: string;
    type: string;
    props: Record<string, any>;
  }>;
}

export async function handleDraft(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = process.hrtime.bigint();
  try {
    const userId = request.userId; // Get userId from the authenticated request

    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized: User ID not found' });
      return;
    }

    // Dynamically determine projectId based on userId
    const userProject = await db.query.projects.findFirst({
      where: eq(projects.ownerId, userId),
    });

    if (!userProject) {
      reply.status(404).send({ error: 'No project found for this user' });
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
            props: {
              title: 'Welcome to Navo (Default)',
              subtitle: 'AI-Powered Web Builder',
            },
          },
          {
            id: 'default-c2',
            type: 'Hero',
            props: {
              headline: 'Build Amazing Websites (Default)',
              cta: 'Get Started',
            },
          },
        ],
      };
    }

    const endTime = process.hrtime.bigint();
    const tookMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    reply.send({
      ok: true,
      draft: {
        id: page?.id || 'default-draft-id',
        layout: layout,
        lastModified:
          page?.updatedAt?.toISOString() || new Date().toISOString(),
      },
      tookMs: tookMs,
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    reply.status(500).send({ error: 'Failed to fetch draft' });
  }
}

export async function handleSave(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { layout } = request.body as any;

    if (!layout) {
      reply.status(400).send({ error: 'Layout is required' });
      return;
    }

    // For now, just log the save operation
    // TODO: Implement actual draft saving to database
    console.log('Saving draft layout:', layout);

    reply.send({
      ok: true,
      message: 'Draft saved successfully',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    reply.status(500).send({ error: 'Failed to save draft' });
  }
}
