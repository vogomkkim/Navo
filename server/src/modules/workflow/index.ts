/**
 * @file Entry point for the workflow module.
 * This file initializes and exports the core components of the workflow engine.
 */

import { WorkflowExecutor } from './workflowExecutor';
import { toolRegistry } from './toolRegistry';

// Import all tools and register them
import { runShellCommandTool } from './tools/runShellCommand.tool';
import { listDirectoryTool, readFileTool, writeFileTool } from './tools/fileSystem.tool';
import { createProjectArchitectureTool } from './tools/projectArchitect.tool';
import { generateProjectFilesTool } from './tools/codeGenerator.tool';

// --- Tool Registration ---
// As we create more tools, we register them here.
// In a more advanced setup, this could be done dynamically by scanning the 'tools' directory.
toolRegistry.register(runShellCommandTool);
toolRegistry.register(listDirectoryTool);
toolRegistry.register(readFileTool);
toolRegistry.register(writeFileTool);
toolRegistry.register(createProjectArchitectureTool);
toolRegistry.register(generateProjectFilesTool);

// --- Service Instantiation ---
// Create a singleton instance of the executor to be used by other services.
export const workflowExecutor = new WorkflowExecutor();

// --- Exports for external use ---
export * from './types';
export { toolRegistry };
