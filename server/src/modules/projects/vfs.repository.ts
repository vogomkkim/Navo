import { and, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

import { db } from '@/db/db.instance';
import { vfsNodes } from '@/schema';
import type {
  ProjectArchitecture,
  VfsNode,
} from '@/modules/projects/projects.types';

export interface VfsRepository {
  createRootNode(projectId: string, tx?: any): Promise<VfsNode>;
  syncArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
  ): Promise<void>;
  listNodesByParentId(
    projectId: string,
    parentId: string | null,
  ): Promise<VfsNode[]>;
  getNodeById(nodeId: string, projectId: string): Promise<VfsNode | null>;
  updateNodeContent(nodeId: string, content: string): Promise<VfsNode | null>;
}

export class VfsRepositoryImpl implements VfsRepository {
  constructor(private readonly app: FastifyInstance) {}

  async createRootNode(projectId: string, tx: any = db): Promise<VfsNode> {
    const [root] = await tx
      .insert(vfsNodes)
      .values({
        projectId,
        parentId: null,
        nodeType: 'DIRECTORY',
        name: '/',
      })
      .returning();
    return root as VfsNode;
  }

  async syncArchitecture(
    projectId: string,
    architecture: ProjectArchitecture,
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        const rootNodeResult = await tx
          .select({ id: vfsNodes.id })
          .from(vfsNodes)
          .where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NULL`));
        const rootId = rootNodeResult[0]?.id;
        if (!rootId) throw new Error('Project root directory not found.');

        // Delete old nodes except the root
        await tx.delete(vfsNodes).where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NOT NULL`));

        // Create new nodes based on the 'pages' array
        if (architecture.pages && architecture.pages.length > 0) {
          for (const page of architecture.pages) {
            await tx
              .insert(vfsNodes)
              .values({
                projectId,
                parentId: rootId, // Assuming all pages are at the root level for now
                nodeType: 'FILE',
                name: page.name,
                content: page.content ?? '',
                metadata: page.metadata ?? {},
              });
          }
        }
      });
      this.app.log.info({ projectId }, 'Project architecture applied to VFS.');
    } catch (error) {
      this.app.log.error(error, 'Failed to apply project architecture to VFS.');
      throw new Error('Failed to apply project architecture.');
    }
  }

  async listNodesByParentId(
    projectId: string,
    parentId: string | null,
  ): Promise<VfsNode[]> {
    try {
      const whereCondition = parentId ? and(eq(vfsNodes.projectId, projectId), eq(vfsNodes.parentId, parentId)) : and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NULL`);
      const dbRows = await db.select().from(vfsNodes).where(whereCondition).orderBy(vfsNodes.nodeType, vfsNodes.name);
      return dbRows as VfsNode[];
    } catch (error) {
      this.app.log.error(error, 'VFS node list query failed');
      throw new Error('Failed to list VFS nodes.');
    }
  }

  async getNodeById(nodeId: string, projectId: string): Promise<VfsNode | null> {
    try {
      const dbRows = await db.select().from(vfsNodes).where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId))).limit(1);
      if (dbRows.length === 0) return null;
      return dbRows[0] as VfsNode;
    } catch (error) {
      this.app.log.error(error, 'VFS node query failed');
      throw new Error('Failed to get VFS node.');
    }
  }

  async updateNodeContent(nodeId: string, content: string): Promise<VfsNode | null> {
    try {
      const updatedRows = await db.update(vfsNodes).set({ content, updatedAt: new Date().toISOString() }).where(eq(vfsNodes.id, nodeId)).returning();
      if (updatedRows.length === 0) return null;
      return updatedRows[0] as VfsNode;
    } catch (error) {
      this.app.log.error(error, 'VFS node update failed');
      throw new Error('Failed to update VFS node content.');
    }
  }
}
