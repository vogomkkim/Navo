// Components 모듈 공통 타입 정의

export interface ComponentDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  category: string;
  propsSchema: any;
  renderTemplate: string;
  cssStyles?: string | null;
  isActive: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComponentDefinitionData {
  name: string;
  displayName: string;
  description?: string | null;
  category: string;
  propsSchema: any;
  renderTemplate: string;
  cssStyles?: string | null;
  projectId: string;
}

export interface UpdateComponentDefinitionData {
  displayName?: string;
  description?: string | null;
  category?: string;
  propsSchema?: any;
  renderTemplate?: string;
  cssStyles?: string | null;
  isActive?: boolean;
}

// --- New Types for Component Instances ---

export interface ComponentInstance {
  id: string;
  pageId: string;
  componentDefinitionId: string;
  props: any;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComponentInstanceData {
  pageId: string;
  componentDefinitionId: string;
  props: any;
  orderIndex: number;
}

export interface UpdateComponentInstanceData {
  props?: any;
  orderIndex?: number;
}

export interface ComponentsRepository {
  listComponentDefinitions(projectId: string): Promise<ComponentDefinition[]>;
  getComponentDefinitionById(id: string): Promise<ComponentDefinition | null>;
  getComponentDefinitionByName(
    name: string,
    projectId: string
  ): Promise<ComponentDefinition | null>;
  createComponentDefinition(
    data: CreateComponentDefinitionData
  ): Promise<ComponentDefinition>;
  updateComponentDefinition(
    id: string,
    data: UpdateComponentDefinitionData
  ): Promise<ComponentDefinition>;
  deleteComponentDefinition(id: string): Promise<void>;
  seedComponentDefinitions(
    projectId: string,
    components: any[]
  ): Promise<ComponentDefinition[]>;

  // --- New Repository Methods for Instances ---
  countComponentsByPageId(pageId: string): Promise<number>;
  createComponentInstance(
    data: CreateComponentInstanceData
  ): Promise<ComponentInstance>;
}
