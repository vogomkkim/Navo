import { MasterDeveloperAgent, ProjectPlan } from './masterDeveloperAgent.js';
import { VirtualPreviewGeneratorAgent } from './virtualPreviewGeneratorAgent.js';
import { ProjectRequest } from './core/masterDeveloper.js';

export interface GenerateProjectPlanContext {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  [key: string]: unknown;
}

export async function generateProjectPlan(
  request: ProjectRequest,
  context: GenerateProjectPlanContext = {}
): Promise<ProjectPlan> {
  const agent = new MasterDeveloperAgent();
  return await agent.createProject(request, context);
}

export async function generateVirtualPreview(
  pageId: string,
  filePath: string
): Promise<string> {
  const previewAgent = new VirtualPreviewGeneratorAgent();
  return await previewAgent.execute({ pageId, filePath });
}

