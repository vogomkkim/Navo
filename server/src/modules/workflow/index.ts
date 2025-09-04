/**
 * @file Entry point for the workflow module.
 * This file initializes and exports the core components of the workflow engine.
 */

import { toolRegistry } from './toolRegistry';
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
import { WorkflowExecutor } from './workflowExecutor';

// --- Tool Registration ---
// As we create more tools, we register them here.
// In a more advanced setup, this could be done dynamically by scanning the 'tools' directory.
toolRegistry.register(runShellCommandTool);
toolRegistry.register(listDirectoryTool);
toolRegistry.register(readFileTool);
toolRegistry.register(writeFileTool);
toolRegistry.register(createProjectArchitectureTool);
toolRegistry.register(generateProjectFilesTool);
toolRegistry.register(createOrganizationTool);

// --- Service Instantiation ---
// Create a singleton instance of the executor to be used by other services.
export const workflowExecutor = new WorkflowExecutor();

// --- Exports for external use ---
export * from './types';
export { toolRegistry };
