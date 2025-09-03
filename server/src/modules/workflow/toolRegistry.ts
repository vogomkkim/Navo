/**
 * @file Implements the ToolRegistry, a central repository for all available Tools.
 */

import { Tool } from './types';

/**
 * A simple in-memory registry for discovering and retrieving Tools.
 * The AI Planner will query this registry to see what capabilities are available.
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /**
   * Registers a new tool, making it available for execution.
   * @param tool The tool instance to register.
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      // In a real scenario, you might want a more sophisticated logger.
      console.warn(`[ToolRegistry] Warning: Tool "${tool.name}" is being overwritten.`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Tool registered: ${tool.name}`);
  }

  /**
   * Retrieves a tool by its unique name.
   * @param name The name of the tool to retrieve.
   * @returns The tool instance, or undefined if not found.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Lists all registered tools.
   * This is crucial for the AI Planner to know the full scope of its capabilities.
   * @returns An array of all registered tool instances.
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}

// Create a singleton instance to be used throughout the application.
export const toolRegistry = new ToolRegistry();
