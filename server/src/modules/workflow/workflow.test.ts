/**
 * @file Test suite for the new declarative workflow engine.
 * This is the first voyage of our new architecture.
 */

import { workflowExecutor } from './index';
import { Plan } from './types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

describe('WorkflowEngine', () => {
  it('should execute a simple, single-step plan using the run_shell_command tool', async () => {
    // 1. Define the Plan (The AI's instruction)
    const simplePlan: Plan = {
      name: 'Test Shell Command',
      description: 'A simple plan to verify that the shell command tool works.',
      steps: [
        {
          id: 'list_files_step',
          tool: 'run_shell_command',
          inputs: {
            // Using 'dir' for Windows compatibility.
            command: 'dir',
          },
        },
      ],
    };

    // 2. Execute the Plan
    const outputs = await workflowExecutor.execute(simplePlan);

    // 3. Verify the result
    const stepResult = outputs.get('list_files_step');

    console.log('--- Shell Command Output ---');
    console.log(stepResult.stdout);
    console.log('--------------------------');

    expect(stepResult).toBeDefined();
    expect(stepResult.stderr).toBe('');
    // Check for a file/directory that is likely to exist, like 'package.json'
    expect(stepResult.stdout).toContain('package.json');
  });

  it('should execute a multi-step plan with dependencies', async () => {
    // 1. Define a more complex Plan
    const multiStepPlan: Plan = {
      name: 'Test Multi-Step Echo',
      description: 'Tests dependency management by echoing the output of a previous step.',
      steps: [
        {
          id: 'first_echo',
          tool: 'run_shell_command',
          inputs: {
            command: 'echo Hello from Step 1',
          },
        },
        {
          id: 'second_echo',
          tool: 'run_shell_command',
          inputs: {
            // Dynamically use the output from the 'first_echo' step
            command: 'echo Received: ${steps.first_echo.outputs.stdout}',
          },
          dependencies: ['first_echo'],
        },
      ],
    };

    // 2. Execute the Plan
    const outputs = await workflowExecutor.execute(multiStepPlan);

    // 3. Verify the results
    const firstStepResult = outputs.get('first_echo');
    const secondStepResult = outputs.get('second_echo');

    console.log('--- Multi-Step Output ---');
    console.log('Step 1:', firstStepResult.stdout.trim());
    console.log('Step 2:', secondStepResult.stdout.trim());
    console.log('-------------------------');

    expect(firstStepResult.stdout.trim()).toBe('Hello from Step 1');
    // Note: The exact output might have quotes depending on the shell.
    // We check if it contains the essential parts.
    expect(secondStepResult.stdout).toContain('Received:');
    expect(secondStepResult.stdout).toContain('Hello from Step 1');
  });

  describe('FileSystem Tools', () => {
    const testDir = path.resolve('./temp_test_dir');
    const testFile = path.join(testDir, 'test.txt');
    const testContent = 'Hello from the workflow engine!';

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should write, read, and list files in a sequence', async () => {
      const fsPlan: Plan = {
        name: 'Test FileSystem Tools',
        description: 'Writes a file, lists the directory, and then reads the file back.',
        steps: [
          {
            id: 'write_file_step',
            tool: 'write_file',
            inputs: {
              path: testFile,
              content: testContent,
            },
          },
          {
            id: 'list_dir_step',
            tool: 'list_directory',
            inputs: {
              path: testDir,
            },
            dependencies: ['write_file_step'],
          },
          {
            id: 'read_file_step',
            tool: 'read_file',
            inputs: {
              path: testFile,
            },
            dependencies: ['list_dir_step'],
          },
        ],
      };

      const outputs = await workflowExecutor.execute(fsPlan);

      // Verify write step
      const writeResult = outputs.get('write_file_step');
      expect(writeResult.success).toBe(true);

      // Verify list step
      const listResult = outputs.get('list_dir_step');
      expect(listResult).toContain('test.txt');

      // Verify read step
      const readResult = outputs.get('read_file_step');
      expect(readResult).toBe(testContent);

      console.log('\n--- FileSystem Test Sequence ---');
      console.log('Write Result:', writeResult);
      console.log('List Result:', listResult);
      console.log('Read Result:', readResult);
      console.log('------------------------------\n');
    });
  });

  describe('Project Architect Tool', () => {
    it('should generate a project architecture from a user request', async () => {
      const architectPlan: Plan = {
        name: 'Test Project Architect Tool',
        description: 'Generates a project plan for a simple quiz app.',
        steps: [
          {
            id: 'architect_step',
            tool: 'create_project_architecture',
            inputs: {
              name: 'AI Quiz App',
              description: 'A simple app where users can answer AI-generated quizzes.',
              type: 'web-application',
            },
          },
        ],
      };

      const outputs = await workflowExecutor.execute(architectPlan);
      const architectResult = outputs.get('architect_step');

      console.log('\n--- Project Architect Output ---');
      console.log(JSON.stringify(architectResult, null, 2));
      console.log('--------------------------------\n');

      expect(architectResult).toBeDefined();
      expect(architectResult.project).toBeDefined();
      expect(architectResult.project.name).toBeDefined();
      expect(architectResult.project.pages).toBeInstanceOf(Array);
      expect(architectResult.project.components).toBeInstanceOf(Array);
      expect(architectResult.project.file_structure).toBeDefined();
    }, 30000); // Increase timeout to 30s for AI API calls
  });

  describe('E2E Project Generation', () => {
    const tempDir = path.resolve('./temp_e2e_project');

    afterAll(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should first design an architecture and then generate the project files', async () => {
      const e2ePlan: Plan = {
        name: 'E2E Project Generation Test',
        description: 'Designs and generates a simple project.',
        steps: [
          {
            id: 'design_step',
            tool: 'create_project_architecture',
            inputs: {
              name: 'E2E Test Project',
              description: 'A project for e2e testing.',
              type: 'web-application',
            },
          },
          {
            id: 'generate_step',
            tool: 'generate_project_files',
            inputs: {
              architecture: '${steps.design_step.outputs.project}',
              basePath: tempDir,
            },
            dependencies: ['design_step'],
          },
        ],
      };

      const outputs = await workflowExecutor.execute(e2ePlan);

      // Verify design step output
      const designResult = outputs.get('design_step');
      expect(designResult.project.name).toBeDefined();

      // Verify generation step output
      const generateResult = outputs.get('generate_step');
      expect(generateResult.success).toBe(true);
      // Check for parts of the name, as AI might format it differently (e.g. with spaces or dashes)
      expect(generateResult.projectPath).toContain('E2E');
      expect(generateResult.projectPath).toContain('Test');
      expect(generateResult.projectPath).toContain('Project');
      expect(generateResult.filesCreated.length).toBeGreaterThan(1);

      // Verify actual file system
      const readmePath = path.join(generateResult.projectPath, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      expect(readmeContent).toContain('# E2E Test Project');

      console.log('\n--- E2E Project Generation ---');
      console.log(`Project created at: ${generateResult.projectPath}`);
      console.log(`${generateResult.filesCreated.length} files created.`);
      console.log('------------------------------\n');

    }, 40000); // Increase timeout to 40s for AI + File I/O
  });
});

