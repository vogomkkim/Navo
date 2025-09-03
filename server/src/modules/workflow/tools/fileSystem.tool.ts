/**
 * @file Defines tools for interacting with the file system.
 */

import { Tool, ExecutionContext } from '../types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// --- 1. List Directory Tool ---
export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'Lists the contents of a specified directory.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The path to the directory.' },
    },
    required: ['path'],
  },
  outputSchema: {
    type: 'array',
    items: { type: 'string' },
  },
  async execute(context: ExecutionContext, input: { path: string }): Promise<string[]> {
    console.log(`[list_directory] Listing contents of: ${input.path}`);
    try {
      // Basic security: prevent directory traversal attacks.
      // A real implementation would need a much more robust sandboxing mechanism.
      const resolvedPath = path.resolve(input.path);
      if (!resolvedPath.startsWith(process.cwd())) {
         throw new Error('Directory traversal is not allowed.');
      }
      return await fs.readdir(resolvedPath);
    } catch (error: any) {
      console.error(`[list_directory] Failed to list directory "${input.path}":`, error);
      throw error;
    }
  },
};

// --- 2. Read File Tool ---
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Reads the content of a specified file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The path to the file.' },
    },
    required: ['path'],
  },
  outputSchema: {
    type: 'string',
  },
  async execute(context: ExecutionContext, input: { path: string }): Promise<string> {
    console.log(`[read_file] Reading file: ${input.path}`);
    try {
      const resolvedPath = path.resolve(input.path);
       if (!resolvedPath.startsWith(process.cwd())) {
         throw new Error('Directory traversal is not allowed.');
      }
      return await fs.readFile(resolvedPath, 'utf-8');
    } catch (error: any) {
      console.error(`[read_file] Failed to read file "${input.path}":`, error);
      throw error;
    }
  },
};

// --- 3. Write File Tool ---
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Writes content to a specified file, creating it if it does not exist.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The path to the file.' },
      content: { type: 'string', description: 'The content to write to the file.' },
    },
    required: ['path', 'content'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      path: { type: 'string' },
    },
  },
  async execute(context: ExecutionContext, input: { path: string; content: string }): Promise<{ success: boolean, path: string }> {
    console.log(`[write_file] Writing to file: ${input.path}`);
    try {
       const resolvedPath = path.resolve(input.path);
       if (!resolvedPath.startsWith(process.cwd())) {
         throw new Error('Directory traversal is not allowed.');
      }
      await fs.writeFile(resolvedPath, input.content, 'utf-8');
      return { success: true, path: resolvedPath };
    } catch (error: any) {
      console.error(`[write_file] Failed to write to file "${input.path}":`, error);
      throw error;
    }
  },
};
