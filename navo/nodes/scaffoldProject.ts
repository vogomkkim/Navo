import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

// Simple logger for now
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
};

export async function scaffoldProject(
  projectId: string,
  generatedStructure: any
): Promise<{ projectPath: string }> {
  logger.info("Scaffolding project...");

  if (!projectId || !generatedStructure) {
    logger.error("Project ID or generated structure missing for scaffolding.");
    throw new Error(
      "Scaffolding failed: Missing project ID or generated structure."
    );
  }

  const projectDir = path.join(process.cwd(), "generated_projects", projectId);

  try {
    await fs.mkdir(projectDir, { recursive: true });
    logger.info(`Created project directory: ${projectDir}`);

    // Create basic file structure (e.g., package.json, tsconfig.json)
    await fs.writeFile(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: `project-${projectId}`,
          version: "1.0.0",
          private: true,
          type: "module",
          scripts: {
            start: "node dist/index.js",
            build: "tsc",
          },
          dependencies: {
            ...(generatedStructure.apiEndpoints && { fastify: "^5.5.0" }), // Add Fastify if API endpoints exist
            // Add common dependencies here, e.g., express, react, etc.
          },
        },
        null,
        2
      )
    );
    logger.info("Created package.json");

    // Install dependencies
    logger.info("Installing dependencies...");
    const npmInstallProcess = spawnSync("npm", ["install"], {
      cwd: projectDir,
      stdio: "inherit", // Pipe stdio to parent process
    });

    if (npmInstallProcess.status !== 0) {
      logger.error(
        `npm install failed with exit code ${npmInstallProcess.status}`
      );
      throw new Error("Failed to install dependencies.");
    }
    logger.info("Dependencies installed successfully.");

    await fs.writeFile(
      path.join(projectDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ES2022",
            lib: ["ES2022", "DOM"],
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            outDir: "dist",
          },
          include: ["src/**/*"],
          exclude: ["node_modules"],
        },
        null,
        2
      )
    );
    logger.info("Created tsconfig.json");

    await fs.mkdir(path.join(projectDir, "src"), { recursive: true });
    logger.info("Created src directory");

    let indexTsContent = 'console.log("Project scaffolded!");';

    if (
      generatedStructure.apiEndpoints &&
      generatedStructure.apiEndpoints.length > 0
    ) {
      indexTsContent = `import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/', async (request, reply) => {
  return { hello: 'world' };
});

const start = async () => {
  try {
    await app.listen({ port: 3001 });
console.log('Fastify server listening on port 3001');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
`;
      logger.info("Generated basic Fastify server in src/index.ts");
    } else if (
      generatedStructure.pages &&
      generatedStructure.pages.length > 0
    ) {
      // TODO: Generate basic React app structure
      logger.info("Generated basic React app placeholder in src/index.ts");
    }

    await fs.writeFile(
      path.join(projectDir, "src", "index.ts"),
      indexTsContent
    );
    logger.info("Created src/index.ts");

    logger.info("Project scaffolding completed.");
    return { projectPath: projectDir };
  } catch (error) {
    logger.error(`Error during project scaffolding: ${error}`);
    throw error;
  }
}
