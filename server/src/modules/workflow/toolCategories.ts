/**
 * @file Tool categorization and priority system
 * This file defines how tools are categorized and prioritized based on project context
 */

export enum ProjectType {
  VFS = 'VFS',
  LOCAL = 'LOCAL',
  HYBRID = 'HYBRID'
}

export enum ToolCategory {
  VFS = 'VFS',
  LOCAL_FS = 'LOCAL_FS',
  DATABASE = 'DATABASE',
  SHELL = 'SHELL',
  ARCHITECTURE = 'ARCHITECTURE'
}

export interface ToolInfo {
  name: string;
  category: ToolCategory;
  priority: number; // Lower number = higher priority
  projectTypes: ProjectType[]; // Which project types this tool supports
  description: string;
}

// Tool definitions with categories and priorities
export const TOOL_DEFINITIONS: Record<string, ToolInfo> = {
  // VFS Tools (highest priority for VFS projects)
  'create_vfs_file': {
    name: 'create_vfs_file',
    category: ToolCategory.VFS,
    priority: 1,
    projectTypes: [ProjectType.VFS, ProjectType.HYBRID],
    description: 'Creates files in the Virtual File System'
  },
  'create_vfs_directory': {
    name: 'create_vfs_directory',
    category: ToolCategory.VFS,
    priority: 2,
    projectTypes: [ProjectType.VFS, ProjectType.HYBRID],
    description: 'Creates directories in the Virtual File System'
  },

  // Local File System Tools (lower priority, only for LOCAL projects)
  'write_file': {
    name: 'write_file',
    category: ToolCategory.LOCAL_FS,
    priority: 10,
    projectTypes: [ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Writes files to the local file system'
  },
  'read_file': {
    name: 'read_file',
    category: ToolCategory.LOCAL_FS,
    priority: 11,
    projectTypes: [ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Reads files from the local file system'
  },
  'list_directory': {
    name: 'list_directory',
    category: ToolCategory.LOCAL_FS,
    priority: 12,
    projectTypes: [ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Lists directory contents from the local file system'
  },

  // Database Tools
  'create_project_in_db': {
    name: 'create_project_in_db',
    category: ToolCategory.DATABASE,
    priority: 5,
    projectTypes: [ProjectType.VFS, ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Creates a new project in the database'
  },
  'update_project_from_architecture': {
    name: 'update_project_from_architecture',
    category: ToolCategory.DATABASE,
    priority: 6,
    projectTypes: [ProjectType.VFS, ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Updates project architecture in the database'
  },

  // Architecture Tools
  'create_project_architecture': {
    name: 'create_project_architecture',
    category: ToolCategory.ARCHITECTURE,
    priority: 3,
    projectTypes: [ProjectType.VFS, ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Creates project architecture'
  },

  // Shell Tools
  'run_shell_command': {
    name: 'run_shell_command',
    category: ToolCategory.SHELL,
    priority: 15,
    projectTypes: [ProjectType.LOCAL, ProjectType.HYBRID],
    description: 'Runs shell commands'
  }
};

/**
 * Get available tools for a specific project type, sorted by priority
 */
export function getAvailableTools(projectType: ProjectType): ToolInfo[] {
  return Object.values(TOOL_DEFINITIONS)
    .filter(tool => tool.projectTypes.includes(projectType))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get tools by category for a specific project type
 */
export function getToolsByCategory(projectType: ProjectType, category: ToolCategory): ToolInfo[] {
  return Object.values(TOOL_DEFINITIONS)
    .filter(tool =>
      tool.projectTypes.includes(projectType) &&
      tool.category === category
    )
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Check if a tool is appropriate for a project type
 */
export function isToolAppropriate(toolName: string, projectType: ProjectType): boolean {
  const tool = TOOL_DEFINITIONS[toolName];
  return tool ? tool.projectTypes.includes(projectType) : false;
}

/**
 * Get the best tool for a specific operation and project type
 */
export function getBestTool(operation: string, projectType: ProjectType): ToolInfo | null {
  const availableTools = getAvailableTools(projectType);

  // Simple keyword matching for now
  const keywords = operation.toLowerCase().split(' ');

  for (const tool of availableTools) {
    if (keywords.some(keyword =>
      tool.name.toLowerCase().includes(keyword) ||
      tool.description.toLowerCase().includes(keyword)
    )) {
      return tool;
    }
  }

  return availableTools[0] || null; // Return highest priority tool as fallback
}
