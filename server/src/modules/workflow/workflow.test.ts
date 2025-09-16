/**
 * @file Test suite for the new declarative workflow engine.
 * This is the first voyage of our new architecture.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { workflowExecutor } from "./index";
import { Plan } from "./types";
import { ProjectsService } from "../projects/projects.service";
import { vi } from "vitest";

describe("WorkflowEngine", () => {
  const mockApp = {
    log: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.log,
    },
  };

  it("should execute a simple, single-step plan using the run_shell_command tool", async () => {
    // 1. Define the Plan (The AI's instruction)
    const simplePlan: Plan = {
      name: "Test Shell Command",
      description: "A simple plan to verify that the shell command tool works.",
      steps: [
        {
          id: "list_files_step",
          title: "List current directory",
          description:
            "Runs a shell command to list files in the working directory",
          tool: "run_shell_command",
          inputs: {
            // Using 'dir' for Windows compatibility.
            command: "dir",
          },
        },
      ],
    };

    // 2. Execute the Plan
    const outputs = await workflowExecutor.execute(mockApp, simplePlan);

    // 3. Verify the result
    const stepResult = outputs.get("list_files_step");

    console.log("--- Shell Command Output ---");
    console.log(stepResult.stdout);
    console.log("--------------------------");

    expect(stepResult).toBeDefined();
    expect(stepResult.stderr).toBe("");
    // Check for a file/directory that is likely to exist, like 'package.json'
    expect(stepResult.stdout).toContain("package.json");
  });

  it("should execute a multi-step plan with dependencies", async () => {
    // 1. Define a more complex Plan
    const multiStepPlan: Plan = {
      name: "Test Multi-Step Echo",
      description:
        "Tests dependency management by echoing the output of a previous step.",
      steps: [
        {
          id: "first_echo",
          title: "Echo step 1",
          description: "Echoes a simple message to be used by the next step",
          tool: "run_shell_command",
          inputs: {
            command: "echo Hello from Step 1",
          },
        },
        {
          id: "second_echo",
          title: "Echo step 2",
          description: "Echoes a message that includes the output from step 1",
          tool: "run_shell_command",
          inputs: {
            // Dynamically use the output from the 'first_echo' step
            command: "echo Received: ${steps.first_echo.outputs.stdout}",
          },
          dependencies: ["first_echo"],
        },
      ],
    };

    // 2. Execute the Plan
    const outputs = await workflowExecutor.execute(mockApp, multiStepPlan);

    // 3. Verify the results
    const firstStepResult = outputs.get("first_echo");
    const secondStepResult = outputs.get("second_echo");

    console.log("--- Multi-Step Output ---");
    console.log("Step 1:", firstStepResult.stdout.trim());
    console.log("Step 2:", secondStepResult.stdout.trim());
    console.log("-------------------------");

    expect(firstStepResult.stdout.trim()).toBe("Hello from Step 1");
    // Note: The exact output might have quotes depending on the shell.
    // We check if it contains the essential parts.
    expect(secondStepResult.stdout).toContain("Received:");
    expect(secondStepResult.stdout).toContain("Hello from Step 1");
  });

  describe("FileSystem Tools", () => {
    const testDir = path.resolve("./temp_test_dir");
    const testFile = path.join(testDir, "test.txt");
    const testContent = "Hello from the workflow engine!";

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should write, read, and list files in a sequence", async () => {
      const fsPlan: Plan = {
        name: "Test FileSystem Tools",
        description:
          "Writes a file, lists the directory, and then reads the file back.",
        steps: [
          {
            id: "write_file_step",
            title: "Write file",
            description: "Writes a test file to disk",
            tool: "write_file",
            inputs: {
              path: testFile,
              content: testContent,
            },
          },
          {
            id: "list_dir_step",
            title: "List directory",
            description: "Lists the contents of the temporary test directory",
            tool: "list_directory",
            inputs: {
              path: testDir,
            },
            dependencies: ["write_file_step"],
          },
          {
            id: "read_file_step",
            title: "Read file",
            description: "Reads back the previously written test file",
            tool: "read_file",
            inputs: {
              path: testFile,
            },
            dependencies: ["list_dir_step"],
          },
        ],
      };

      const outputs = await workflowExecutor.execute(mockApp, fsPlan);

      // Verify write step
      const writeResult = outputs.get("write_file_step");
      expect(writeResult.success).toBe(true);

      // Verify list step
      const listResult = outputs.get("list_dir_step");
      expect(listResult).toContain("test.txt");

      // Verify read step
      const readResult = outputs.get("read_file_step");
      expect(readResult).toBe(testContent);

      console.log("\n--- FileSystem Test Sequence ---");
      console.log("Write Result:", writeResult);
      console.log("List Result:", listResult);
      console.log("Read Result:", readResult);
      console.log("------------------------------\n");
    });
  });

  describe("Project Architect Tool", () => {
    it("should generate a project architecture from a user request", async () => {
      const architectPlan: Plan = {
        name: "Test Project Architect Tool",
        description: "Generates a project plan for a simple quiz app.",
        steps: [
          {
            id: "architect_step",
            title: "Design project architecture",
            description: "Uses AI to design a simple project architecture",
            tool: "create_project_architecture",
            inputs: {
              name: "AI Quiz App",
              description:
                "A simple app where users can answer AI-generated quizzes.",
              type: "web-application",
            },
          },
        ],
      };

      const outputs = await workflowExecutor.execute(mockApp, architectPlan);
      const architectResult = outputs.get("architect_step");

      console.log("\n--- Project Architect Output ---");
      console.log(JSON.stringify(architectResult, null, 2));
      console.log("--------------------------------\n");

      expect(architectResult).toBeDefined();
      expect(architectResult.project).toBeDefined();
      expect(architectResult.project.name).toBeDefined();
      expect(architectResult.project.pages).toBeInstanceOf(Array);
      expect(architectResult.project.components).toBeInstanceOf(Array);
      expect(architectResult.project.file_structure).toBeDefined();
    }, 30000); // Increase timeout to 30s for AI API calls
  });

  describe("E2E Project Generation", () => {
    let designResult: any;
    let createVfsNodeSpy: any;

    beforeAll(() => {
      // Mock VFS writes to avoid real DB dependency and pass authorization guard
      createVfsNodeSpy = vi
        .spyOn(ProjectsService.prototype, "createVfsNode")
        .mockImplementation(
          async (projectId: string, _userId: string, params: any) => {
            return {
              id: `n_${Math.random().toString(36).slice(2)}`,
              projectId,
              parentId: params.parentId ?? null,
              nodeType: params.nodeType,
              name: params.name,
              content: params.content ?? null,
            } as any;
          }
        );
    });

    afterAll(() => {
      try {
        createVfsNodeSpy?.mockRestore?.();
      } catch (_e) {
        /* no-op */
      }
    });

    // Run design step first and store the result
    it("should first design an architecture", async () => {
      const designPlan: Plan = {
        name: "E2E Design Step",
        description: "Designs a simple project.",
        steps: [
          {
            id: "design_step",
            title: "Design architecture",
            description:
              "Generates a blueprint file structure for the E2E test",
            tool: "create_project_architecture",
            inputs: {
              name: "E2E Test Project",
              description: "A project for e2e testing.",
              type: "web-application",
            },
          },
        ],
      };
      const designOutputs = await workflowExecutor.execute(mockApp, designPlan);
      designResult = designOutputs.get("design_step");
      expect(designResult.project.name).toBeDefined();
      expect(designResult.project.file_structure).toBeDefined();
    }, 40000);

    // Run generation step using the result from the first step
    it("should then generate the project files in VFS", async () => {
      // This test depends on the previous one completing successfully
      expect(designResult).toBeDefined();

      const generationPlan: Plan = {
        name: "E2E Generation Step",
        description: "Generates files from a blueprint.",
        steps: [
          {
            id: "generate_step",
            title: "Scaffold structure to VFS",
            description:
              "Creates VFS nodes from the previously designed file structure",
            tool: "scaffold_project_from_blueprint",
            inputs: {
              projectId: "test-project-id-vfs",
              userId: "test-user-id-vfs",
              file_structure: designResult.project.file_structure,
            },
          },
        ],
      };
      const generationOutputs = await workflowExecutor.execute(
        mockApp,
        generationPlan
      );
      const generateResult = generationOutputs.get("generate_step");
      expect(generateResult.success).toBe(true);
      expect(generateResult.message).toContain("scaffolded successfully");

      console.log("\n--- E2E VFS Project Generation ---");
      console.log(`VFS scaffolding reported: ${generateResult.message}`);
      console.log("----------------------------------\n");
    });
  });
});
