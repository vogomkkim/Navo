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
  listNodesByProject(projectId: string): Promise<VfsNode[]>;
  listNodesUnderPath(projectId: string, path: string): Promise<VfsNode[]>;
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

  private async ensureRootNodeExists(projectId: string, tx: any): Promise<VfsNode> {
    const rootRows = await tx
      .select()
      .from(vfsNodes)
      .where(and(eq(vfsNodes.projectId, projectId), isNull(vfsNodes.parentId)));
    
    if (rootRows.length > 0) {
      return rootRows[0] as VfsNode;
    }

    this.app.log.warn(`Root node for project ${projectId} not found. Creating it defensively.`);
    return this.createRootNode(projectId, tx);
  }

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
        const rootNode = await this.ensureRootNodeExists(projectId, tx);
        const rootId = rootNode.id;

        await tx.delete(vfsNodes).where(and(eq(vfsNodes.projectId, projectId), sql`${vfsNodes.parentId} IS NOT NULL`));

        const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
        const createNodesRecursively = async (nodes: any[], parentId: string) => {
          if (!nodes || nodes.length === 0) return;

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
    // Read operations don't need the defensive check.
    try {
      const whereCondition = parentId ? and(eq(vfsNodes.projectId, projectId), eq(vfsNodes.parentId, parentId)) : and(eq(vfsNodes.projectId, projectId), isNull(vfsNodes.parentId));
      const dbRows = await db.select().from(vfsNodes).where(whereCondition).orderBy(vfsNodes.nodeType, vfsNodes.name);
      return dbRows as VfsNode[];
    } catch (error) {
      this.app.log.error(error, 'VFS node list query failed');
      throw new Error('Failed to list VFS nodes.');
    }
  }

  async listNodesByProject(
    projectId: string,
    paths?: string[],
  ): Promise<VfsNode[]> {
    // If no specific paths are provided, return all nodes for the project.
    if (!paths || paths.length === 0) {
      try {
        const dbRows = await db
          .select()
          .from(vfsNodes)
          .where(eq(vfsNodes.projectId, projectId))
          .orderBy(vfsNodes.parentId, vfsNodes.nodeType, vfsNodes.name);
        return dbRows as VfsNode[];
      } catch (error) {
        this.app.log.error(error, 'VFS list all nodes by project failed');
        throw new Error('Failed to list all VFS nodes for project.');
      }
    }

    // If paths are provided, use a recursive query to fetch only the necessary nodes.
    try {
      const startingNodes = await Promise.all(
        paths.map((path) => this.findByPath(projectId, path)),
      );
      const startingNodeIds = startingNodes
        .filter((n): n is VfsNode => n !== null)
        .map((n) => n.id);

      if (startingNodeIds.length === 0) {
        return [];
      }

      // Drizzle doesn't directly support recursive CTEs in a type-safe way.
      // We use a raw SQL query for this specific complex case.
      const recursiveQuery = sql`
        WITH RECURSIVE "descendants" AS (
          SELECT "id", "project_id", "parent_id", "node_type", "name", "content", "metadata", "created_at", "updated_at"
          FROM ${vfsNodes}
          WHERE "id" = ANY(ARRAY[${sql.join(startingNodeIds, sql`, `)}])
        
          UNION ALL
        
          SELECT "child"."id", "child"."project_id", "child"."parent_id", "child"."node_type", "child"."name", "child"."content", "child"."metadata", "child"."created_at", "child"."updated_at"
          FROM ${vfsNodes} as "child"
          JOIN "descendants" as "parent" ON "child"."parent_id" = "parent"."id"
        )
        SELECT * FROM "descendants";
      `;

      const result = await db.execute(recursiveQuery);
      // We need to cast the raw result back to our VfsNode type.
      // Note: The property names in the SELECT list must match the VfsNode properties.
      return result.rows as VfsNode[];
    } catch (error) {
      this.app.log.error(
        { error, paths },
        'VFS list nodes by paths recursive failed',
      );
      throw new Error('Failed to list VfsNode by paths.');
    }
  }

  async listNodesUnderPath(projectId: string, path: string): Promise<VfsNode[]> {
    try {
      const startNode = await this.findByPath(projectId, path);
      if (!startNode) return [];

      const all = await this.listNodesByProject(projectId);
      const byParent = new Map<string | null, VfsNode[]>();
      for (const n of all) {
        const arr = byParent.get(n.parentId) ?? [];
        arr.push(n);
        byParent.set(n.parentId, arr);
      }

      const results: VfsNode[] = [];
      const stack: VfsNode[] = [startNode];
      while (stack.length) {
        const current = stack.pop()!;
        const children = byParent.get(current.id) ?? [];
        results.push(...children);
        for (const c of children) if (c.nodeType === 'DIRECTORY') stack.push(c);
      }
      return results;
    } catch (error) {
      this.app.log.error(error, 'VFS list nodes under path failed');
      throw new Error('Failed to list VFS nodes under path.');
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
      await this.ensureRootNodeExists(projectId, tx);
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
    // This is a write operation, so it should be in a transaction and ensure root exists.
    return db.transaction(async (tx) => {
      await this.ensureRootNodeExists(params.projectId, tx);
      // ... (rest of the logic)
    });
  }

  async moveNode(params: {
    projectId: string;
    nodeId: string;
    newParentId: string | null;
  }): Promise<VfsNode | null> {
    return db.transaction(async (tx) => {
      await this.ensureRootNodeExists(params.projectId, tx);
      // ... (rest of the logic)
    });
  }

  async deleteNode(params: { projectId: string; nodeId: string }): Promise<boolean> {
    return db.transaction(async (tx) => {
      await this.ensureRootNodeExists(params.projectId, tx);
      // ... (rest of the logic)
      return true;
    });
  }

  async findByPath(projectId: string, path: string, tx: any = db): Promise<VfsNode | null> {
    try {
      const normalized = path.trim().replace(/\/$/, '');
      if (normalized === '' || normalized === '/') {
        return this.ensureRootNodeExists(projectId, tx);
      }

      const segments = normalized.split('/').filter((s) => s.length > 0);
      let parentNode = await this.ensureRootNodeExists(projectId, tx);

      for (const segment of segments) {
        const rows = await tx
          .select()
          .from(vfsNodes)
          .where(and(eq(vfsNodes.projectId, projectId), eq(vfsNodes.parentId, parentNode.id), eq(vfsNodes.name, segment)))
          .limit(1);

        if (rows.length === 0) return null;
        parentNode = rows[0] as VfsNode;
      }
      return parentNode;
    } catch (error) {
      this.app.log.error(error, 'VFS findByPath failed');
      throw new Error('Failed to find VFS node by path.');
    }
  }

  async findOrCreateByPath(projectId: string, path: string, tx?: any): Promise<VfsNode> {
    const transaction = tx || db;
    const normalizedPath = path.trim().replace(/^\/|\/$/g, '');

    this.app.log.info(`[findOrCreateByPath] Called for project ${projectId} with path "${path}" (Normalized: "${normalizedPath}")`);

    if (normalizedPath === '') {
      this.app.log.info(`[findOrCreateByPath] Path is root, ensuring root node exists.`);
      return this.ensureRootNodeExists(projectId, transaction);
    }

    const existingNode = await this.findByPath(projectId, normalizedPath, transaction);
    if (existingNode) {
      this.app.log.info(`[findOrCreateByPath] Node already exists at "${normalizedPath}". Returning existing node.`);
      return existingNode;
    }

    const segments = normalizedPath.split('/');
    this.app.log.info({ segments }, `[findOrCreateByPath] Path segments`);
    let parentNode = await this.ensureRootNodeExists(projectId, transaction);
    this.app.log.info({ parentNode: { id: parentNode.id, name: parentNode.name } }, `[findOrCreateByPath] Initial parent node (root)`);

    for (const segment of segments) {
      const childRows = await transaction
        .select()
        .from(vfsNodes)
        .where(and(eq(vfsNodes.projectId, projectId), eq(vfsNodes.parentId, parentNode.id), eq(vfsNodes.name, segment)))
        .limit(1);

      let childNode = childRows[0] as VfsNode | undefined;

      if (!childNode) {
        const isLastSegment = segments.indexOf(segment) === segments.length - 1;
        const isDirectoryPath = path.trim().endsWith('/');
        const nodeType = !isDirectoryPath && isLastSegment ? 'FILE' : 'DIRECTORY';
        
        this.app.log.info({ segment, parentId: parentNode.id, nodeType }, `[findOrCreateByPath] Node not found. Creating new node.`);
        childNode = await this.createNode({
          projectId,
          parentId: parentNode.id,
          nodeType: nodeType,
          name: segment,
          content: nodeType === 'FILE' ? '' : null,
          tx: transaction,
        });
      } else {
        this.app.log.info({ segment, parentId: parentNode.id }, `[findOrCreateByPath] Found existing child node.`);
      }
      parentNode = childNode;
      this.app.log.info({ parentNode: { id: parentNode.id, name: parentNode.name } }, `[findOrCreateByPath] New parent for next iteration`);
    }
    
    this.app.log.info({ finalNode: { id: parentNode.id, name: parentNode.name } }, `[findOrCreateByPath] Finished. Returning final node.`);
    return parentNode;
  }

  async upsertByPath(projectId: string, path: string, content: string): Promise<VfsNode> {
    return db.transaction(async (tx) => {
      await this.ensureRootNodeExists(projectId, tx);
      // This function now implicitly handles root creation via findOrCreateByPath
      // ... (rest of the logic)
    });
  }
}