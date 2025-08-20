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

export interface BuildPageOutput {
  html: string;
}


// -- Component-specific props --
// These provide strict type checking for each component's expected properties.

export interface HeaderProps {
  title: string;
  style?: Record<string, string>;
}

export interface HeroProps {
  headline: string;
  cta: string;
  style?: Record<string, string>;
}

export interface FooterProps {
  text: string;
  style?: Record<string, string>;
}


// -- Discriminated Union for Page Components --
// This allows TypeScript to infer the correct props type based on the 'type' field.
// It's the core of our type-safe rendering strategy.

export type PageComponent = 
  | { id: ID; type: 'Header'; props: HeaderProps }
  | { id: ID; type: 'Hero'; props: HeroProps }
  | { id: ID; type: 'Footer'; props: FooterProps };


// -- Page Layout Definition --
// This defines the overall shape of the data our API will return for a page draft.

export interface PageLayout {
  components: PageComponent[];
}
