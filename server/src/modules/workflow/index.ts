/**
 * @file Entry point for the workflow module.
 * This file initializes and exports the core components of the workflow engine.
 */

import { toolRegistry } from './toolRegistry';
import {
  createProjectInDbTool,
  updateProjectFromArchitectureTool,
} from './tools/database.tool';
import { generateProjectFilesTool } from './tools/codeGenerator.tool';
import {
  listDirectoryTool,
  readFileTool,
  writeFileTool,
} from './tools/fileSystem.tool';
import { createOrganizationTool } from './tools/organization.tool';
import { createProjectArchitectureTool } from './tools/projectArchitect.tool';
// Import all tools and register them
import { runShellCommandTool } from './tools/runShellCommand.tool';
import { createVfsFileTool, createVfsDirectoryTool } from './tools/vfs.tool';
import { WorkflowExecutor } from './workflowExecutor';
import { BackendGeneratorTool } from './tools/backend_generator.tool';

// --- Tool Registration ---
// As we create more tools, we register them here.
// In a more advanced setup, this could be done dynamically by scanning the 'tools' directory.
toolRegistry.register(createProjectInDbTool);
toolRegistry.register(updateProjectFromArchitectureTool);
// Register all available tools
// toolRegistry.register(new CreateProjectInDbTool());
// toolRegistry.register(new CreateProjectArchitectureTool());
// toolRegistry.register(new UpdateProjectFromArchitectureTool());
// toolRegistry.register(new BackendGeneratorTool());

toolRegistry.register(runShellCommandTool); // CMS 샌드박스에서 패키지 설치 및 빌드 필요
toolRegistry.register(listDirectoryTool); // CMS에서 템플릿 구조 및 생성된 파일 확인 필요
toolRegistry.register(readFileTool); // CMS에서 템플릿 파일 읽기 및 동적 콘텐츠 조합 필요
toolRegistry.register(writeFileTool); // CMS에서 사용자 입력 기반 동적 콘텐츠 파일 생성 필요
toolRegistry.register(generateProjectFilesTool);
toolRegistry.register(createOrganizationTool);
toolRegistry.register(createVfsFileTool);
toolRegistry.register(createVfsDirectoryTool);
toolRegistry.register(new BackendGeneratorTool());

// --- Service Instantiation ---
// Create a singleton instance of the executor to be used by other services.
export const workflowExecutor = new WorkflowExecutor();

// --- Exports for external use ---
export * from './types';
export { toolRegistry };
