// Pages 모듈 공통 타입 정의

export interface Page {
  id: string;
  path: string;
  name: string;
  description?: string | null;
  layoutJson: any;
  isPublished: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageData {
  path: string;
  name: string;
  description?: string | null;
  layoutJson: any;
  projectId: string;
}

export interface UpdatePageData {
  name?: string;
  description?: string | null;
  layoutJson?: any;
  isPublished?: boolean;
}

export interface PagesRepository {
  listPagesByProjectId(projectId: string): Promise<Page[]>;
  getPageById(pageId: string): Promise<Page | null>;
  getPageByProjectId(pageId: string, projectId: string): Promise<Page | null>;
  createPage(pageData: CreatePageData): Promise<Page>;
  updatePage(pageId: string, pageData: UpdatePageData): Promise<Page>;
  deletePage(pageId: string): Promise<void>;
  getPageByPath(projectId: string, path: string): Promise<Page | null>;
}
