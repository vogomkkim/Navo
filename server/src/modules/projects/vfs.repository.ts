import { and, eq, sql, isNull } from 'drizzle-orm';
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
  updateNodeContent(nodeId: string, projectId: string, content: string): Promise<VfsNode | null>;
  upsertByPath(projectId: string, path: string, content: string): Promise<VfsNode>;
  createNode(params: {
    projectId: string;
    parentId: string | null;
    nodeType: 'FILE' | 'DIRECTORY';
    name: string;
    content?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<VfsNode>;
  renameNode(params: {
    projectId: string;
    nodeId: string;
    newName: string;
  }): Promise<VfsNode | null>;
  moveNode(params: {
    projectId: string;
    nodeId: string;
    newParentId: string | null;
  }): Promise<VfsNode | null>;
  deleteNode(params: { projectId: string; nodeId: string }): Promise<boolean>;
  findByPath(projectId: string, path: string, tx?: any): Promise<VfsNode | null>;
  findOrCreateByPath(projectId: string, path: string): Promise<VfsNode>;
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
        if (!rootId) {
          throw new Error('Project root directory not found.');
        }

        // Delete all existing nodes except the root directory itself
        await tx.delete(vfsNodes).where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NOT NULL`));

        // Helper function to recursively create nodes
        const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
        const createNodesRecursively = async (nodes: any[], parentId: string) => {
          if (!nodes || nodes.length === 0) {
            return;
          }

          for (const node of nodes) {
            const content = node.type === 'FILE' ? node.content ?? '' : null;

            if (content && content.length > MAX_FILE_SIZE_BYTES) {
              throw new Error(`File content for "${node.name}" exceeds the limit of 1MB.`);
            }

            const [newNode] = await tx
              .insert(vfsNodes)
              .values({
                projectId,
                parentId,
                nodeType: node.type === 'FILE' ? 'FILE' : 'DIRECTORY',
                name: node.name,
                content: content,
                metadata: node.metadata ?? {},
              })
              .returning({ id: vfsNodes.id });

            if (node.type === 'DIRECTORY' && newNode?.id && node.children) {
              await createNodesRecursively(node.children, newNode.id);
            }
          }
        };

        let nodesToCreate = (architecture as any).structure || (architecture as any).file_structure;

        // Data transformation logic for legacy formats
        if (!nodesToCreate && (architecture.pages || architecture.components)) {
            this.app.log.warn('Transforming legacy architecture format.');
            nodesToCreate = [];
            if (architecture.pages) {
                const pagesDir = {
                    type: 'DIRECTORY',
                    name: 'pages',
                    children: architecture.pages.map(p => ({ type: 'FILE', name: p.name, content: p.content ?? '' }))
                };
                nodesToCreate.push(pagesDir);
            }
            if (architecture.components) {
                const componentsDir = {
                    type: 'DIRECTORY',
                    name: 'components',
                    children: Object.entries(architecture.components).map(([key, val]: [string, any]) => ({ type: 'FILE', name: val.name ?? `${key}.tsx`, content: val.content ?? '' }))
                };
                nodesToCreate.push(componentsDir);
            }
        }

        // Start the recursive creation from the root
        if (nodesToCreate) {
          await createNodesRecursively(nodesToCreate, rootId);
        } else {
            this.app.log.warn('No valid architecture structure found to sync.');
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

  async updateNodeContent(nodeId: string, projectId: string, content: string): Promise<VfsNode | null> {
    try {
      const updatedRows = await db.update(vfsNodes).set({ content, updatedAt: new Date().toISOString() }).where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId))).returning();
      if (updatedRows.length === 0) return null;
      return updatedRows[0] as VfsNode;
    } catch (error) {
      this.app.log.error(error, 'VFS node update failed');
      throw new Error('Failed to update VFS node content.');
    }
  }

  async createNode(params: {
    projectId: string;
    parentId: string | null;
    nodeType: 'FILE' | 'DIRECTORY';
    name: string;
    content?: string | null;
    metadata?: Record<string, unknown>;
    tx?: any;
  }): Promise<VfsNode> {
    const { projectId, parentId, nodeType, name, tx = db } = params;
    const content = nodeType === 'DIRECTORY' ? null : params.content ?? '';
    const metadata = params.metadata ?? {};
    try {
      const [created] = await tx
        .insert(vfsNodes)
        .values({ projectId, parentId, nodeType, name, content, metadata })
        .returning();
      return created as VfsNode;
    } catch (error: any) {
      this.app.log.error(error, 'VFS node create failed');
      if (typeof error?.message === 'string' && error.message.includes('vfs_nodes_project_id_parent_id_name_key')) {
        throw new Error('A node with the same name already exists in this directory.');
      }
      throw new Error('Failed to create VFS node.');
    }
  }

  async renameNode(params: {
    projectId: string;
    nodeId: string;
    newName: string;
  }): Promise<VfsNode | null> {
    const { projectId, nodeId, newName } = params;
    try {
      // Ensure node belongs to project and get parentId for unique constraint scope
      const existing = await db
        .select({ id: vfsNodes.id, parentId: vfsNodes.parentId })
        .from(vfsNodes)
        .where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId)))
        .limit(1);
      if (existing.length === 0) return null;

      const [updated] = await db
        .update(vfsNodes)
        .set({ name: newName, updatedAt: new Date().toISOString() })
        .where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId)))
        .returning();
      return updated as VfsNode;
    } catch (error: any) {
      this.app.log.error(error, 'VFS node rename failed');
      if (typeof error?.message === 'string' && error.message.includes('vfs_nodes_project_id_parent_id_name_key')) {
        throw new Error('A node with the same name already exists in this directory.');
      }
      throw new Error('Failed to rename VFS node.');
    }
  }

  async moveNode(params: {
    projectId: string;
    nodeId: string;
    newParentId: string | null;
  }): Promise<VfsNode | null> {
    const { projectId, nodeId, newParentId } = params;
    try {
      // Ensure node exists under project
      const existing = await db
        .select({ id: vfsNodes.id })
        .from(vfsNodes)
        .where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId)))
        .limit(1);
      if (existing.length === 0) return null;

      const [updated] = await db
        .update(vfsNodes)
        .set({ parentId: newParentId, updatedAt: new Date().toISOString() })
        .where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId)))
        .returning();
      return updated as VfsNode;
    } catch (error: any) {
      this.app.log.error(error, 'VFS node move failed');
      if (typeof error?.message === 'string' && error.message.includes('vfs_nodes_project_id_parent_id_name_key')) {
        throw new Error('A node with the same name already exists in the target directory.');
      }
      throw new Error('Failed to move VFS node.');
    }
  }

  async deleteNode(params: { projectId: string; nodeId: string }): Promise<boolean> {
    const { projectId, nodeId } = params;
    try {
      const res = await db
        .delete(vfsNodes)
        .where(and(eq(vfsNodes.id, nodeId), eq(vfsNodes.projectId, projectId)));
      // drizzle returns number for affected? Depending on driver; treat success if no error
      return true;
    } catch (error) {
      this.app.log.error(error, 'VFS node delete failed');
      throw new Error('Failed to delete VFS node.');
    }
  }

  async findByPath(projectId: string, path: string, tx: any = db): Promise<VfsNode | null> {
    try {
      const normalized = path.trim().replace(/\/$/, ''); // Also remove trailing slash
      if (normalized === '') {
        const rows = await tx
          .select()
          .from(vfsNodes)
          .where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NULL`))
          .limit(1);
        return (rows[0] as VfsNode) || null;
      }

      const segments = normalized.split('/').filter((s) => s.length > 0);
      let parentId: string | null = null;

      // Find the root node's ID first
      const rootRows = await tx
        .select({ id: vfsNodes.id })
        .from(vfsNodes)
        .where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NULL`));

      if (rootRows.length === 0) return null;
      parentId = rootRows[0].id;

      let currentNode: VfsNode | null = rootRows[0] as VfsNode;
      for (const segment of segments) {
        const rows = await tx
          .select()
          .from(vfsNodes)
          .where(and(eq(vfsNodes.projectId, projectId), parentId ? eq(vfsNodes.parentId, parentId) : isNull(vfsNodes.parentId), eq(vfsNodes.name, segment)))
          .limit(1);

        if (rows.length === 0) return null;
        currentNode = rows[0] as VfsNode;
        parentId = currentNode.id;
      }

      return currentNode;
    } catch (error) {
      this.app.log.error(error, 'VFS findByPath failed');
      throw new Error('Failed to find VFS node by path.');
    }
  }

  async findOrCreateByPath(projectId: string, path: string): Promise<VfsNode> {
    return db.transaction(async (tx) => {
      const existingNode = await this.findByPath(projectId, path, tx);
      if (existingNode) {
        return existingNode;
      }

      const segments = path.split('/').filter(Boolean);
      const fileName = segments.pop();
      if (!fileName) {
        throw new Error('Invalid path provided. Path cannot be empty or just a slash.');
      }

      let parentNode = await this.findByPath(projectId, '/', tx);
      if (!parentNode) {
        throw new Error('Project root directory not found. Cannot create node.');
      }

      for (const segment of segments) {
        const childRows = await tx
            .select()
            .from(vfsNodes)
            .where(and(eq(vfsNodes.projectId, projectId), eq(vfsNodes.parentId, parentNode.id), eq(vfsNodes.name, segment)))
            .limit(1);

        let childNode = childRows[0] as VfsNode | undefined;

        if (!childNode) {
          childNode = await this.createNode({
            projectId,
            parentId: parentNode.id,
            nodeType: 'DIRECTORY',
            name: segment,
            tx,
          });
        }
        parentNode = childNode;
      }

      return this.createNode({
        projectId,
        parentId: parentNode.id,
        nodeType: 'FILE',
        name: fileName,
        content: '',
        tx,
      });
    });
  }

  async upsertByPath(projectId: string, path: string, content: string): Promise<VfsNode> {
    const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
    const normalizedPath = path.trim();
    if (!normalizedPath.startsWith('/')) {
      // Normalize to absolute-like project path (root-relative)
      path = '/' + normalizedPath.replace(/^\/+/, '');
    }
    if (typeof content === 'string' && content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error('File content exceeds the limit of 1MB.');
    }

    // Try to find existing file
    const existing = await this.findByPath(projectId, path);
    if (existing) {
      const updated = await this.updateNodeContent(existing.id, projectId, content);
      return (updated as VfsNode) ?? existing;
    }

    // Create the file (with intermediate directories) then update content
    const created = await this.findOrCreateByPath(projectId, path);
    const updated = await this.updateNodeContent(created.id, projectId, content);
    return (updated as VfsNode) ?? created;
  }
}
