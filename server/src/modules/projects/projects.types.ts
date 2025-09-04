// Projects 모듈 공통 타입 정의

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  requirements?: string | null;
}

export type VfsNodeType = 'FILE' | 'DIRECTORY';

export interface VfsNode {
  id: string;
  projectId: string;
  parentId: string | null;
  nodeType: VfsNodeType;
  name: string;
  content: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectArchitecture {
  pages: Omit<
    VfsNode,
    'id' | 'projectId' | 'parentId' | 'createdAt' | 'updatedAt'
  >[];
  components: Record<string, { props: Record<string, any>; parent?: string }>;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  organizationId: string;
  requirements?: string | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  requirements?: string | null;
}
