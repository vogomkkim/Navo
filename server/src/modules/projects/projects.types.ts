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

export interface ProjectPage {
  id: string;
  path: string;
  name: string;
  description?: string | null;
  layoutJson: any;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface ProjectsRepository {
  listProjectsByOrganizationId(organizationId: string): Promise<Project[]>;
  getProjectById(projectId: string): Promise<Project | null>;
  createProject(projectData: CreateProjectData): Promise<Project>;
  updateProject(
    projectId: string,
    projectData: UpdateProjectData
  ): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  getProjectPages(projectId: string): Promise<ProjectPage[]>;
}
