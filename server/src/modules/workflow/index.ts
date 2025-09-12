/**
 * @file Entry point for the workflow module.
 */
import { toolRegistry } from './toolRegistry';
import { createProjectInDbTool } from './tools/database.tool';
import {
  listDirectoryTool,
  readFileTool,
  writeFileTool,
} from './tools/fileSystem.tool';
import { createOrganizationTool } from './tools/organization.tool';
import { createProjectArchitectureTool } from './tools/projectArchitect.tool';
import { runShellCommandTool } from './tools/runShellCommand.tool';
import { scaffoldProjectTool } from './tools/projectScaffolder.tool';
import { createVfsFileTool, createVfsDirectoryTool } from './tools/vfs.tool'; // Restored
import { DenoFunctionsGeneratorTool } from './tools/deno_functions_generator.tool';
import { syncDenoFunctionsTool } from './tools/deno_sync.tool';
import { WorkflowExecutor } from './workflowExecutor';

// --- Tool Registration ---
// Register high-level, strategic tools for project creation.
toolRegistry.register(createProjectInDbTool);
toolRegistry.register(createProjectArchitectureTool); // Generates the blueprint
toolRegistry.register(scaffoldProjectTool); // Instantiates the blueprint into VFS

// Register surgical tools for incremental changes.
toolRegistry.register(createVfsFileTool);
toolRegistry.register(createVfsDirectoryTool);

// Register foundational tools for file system interaction and command execution.
toolRegistry.register(runShellCommandTool);
toolRegistry.register(listDirectoryTool);
toolRegistry.register(readFileTool);
toolRegistry.register(writeFileTool);

// Register other system-level tools.
toolRegistry.register(createOrganizationTool);
toolRegistry.register(new DenoFunctionsGeneratorTool());
toolRegistry.register(syncDenoFunctionsTool);

// --- Service Instantiation ---
export const workflowExecutor = new WorkflowExecutor();

// --- Exports for external use ---
export * from './types';
export { toolRegistry };
