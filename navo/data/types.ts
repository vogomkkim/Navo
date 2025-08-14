export type ID = string;

export interface User {
  id: ID;
  email: string;
  name?: string;
  createdAt: string; // ISO
}

export interface Project {
  id: ID;
  ownerId: ID; // User.id
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: ID;
  projectId: ID; // Project.id
  path: string; // '/'
  layoutJson: unknown; // serialized layout tree
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: ID;
  pageId: ID; // Page.id
  type: string; // 'section' | 'text' | 'image' | ...
  props: Record<string, unknown>;
  orderIndex: number;
}

export interface Asset {
  id: ID;
  projectId: ID;
  kind: 'image' | 'file' | 'font' | 'other';
  url: string;
  createdAt: string;
}

export interface Event {
  id: ID;
  projectId?: ID;
  userId?: ID;
  type: string; // 'view:page', 'click:cta', 'editor:change', ...
  data?: Record<string, unknown>;
  ts: string;
}

export interface Suggestion {
  id: ID;
  projectId: ID;
  type: 'style' | 'copy';
  content: Record<string, unknown>;
  createdAt: string;
  appliedAt?: string;
}

export interface PublishDeploy {
  id: ID;
  projectId: ID;
  url: string;
  status: 'success' | 'failed';
  createdAt: string;
}