/**
 * @file Defines the run_shell_command tool.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import { ExecutionContext, Tool } from '../types';

const execAsync = promisify(exec);

export const runShellCommandTool: Tool = {
  name: 'run_shell_command',
  description:
    'Executes a shell command in a specified directory and returns its standard output and error streams.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute.',
      },
      cwd: {
        type: 'string',
        description:
          'The working directory to run the command in. Defaults to the project root.',
      },
    },
    required: ['command'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      stdout: {
        type: 'string',
        description: 'The standard output of the command.',
      },
      stderr: {
        type: 'string',
        description: 'The standard error of the command. Empty if no error.',
      },
    },
  },
  async execute(
    context: ExecutionContext,
    input: { command: string; cwd?: string },
  ): Promise<{ stdout: string; stderr: string }> {
    const cwd = input.cwd || process.cwd();
    console.log(
      `[run_shell_command] Executing command: "${input.command}" in "${cwd}"`,
    );
    try {
      const { stdout, stderr } = await execAsync(input.command, { cwd });
      return { stdout, stderr };
    } catch (error: any) {
      console.error(
        `[run_shell_command] Command failed: ${input.command}`,
        error,
      );
      // For shell commands, errors often include stdout and stderr, so we return them.
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || 'An unknown error occurred.',
      };
    }
  },
};
