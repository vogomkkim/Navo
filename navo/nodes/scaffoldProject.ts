import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Simple logger for now
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
};

export async function scaffoldProject(
  projectId: string,
  generatedStructure: any
): Promise<{ projectPath: string }> {
  logger.info('Scaffolding project...');

  if (!projectId || !generatedStructure) {
    logger.error('Project ID or generated structure missing for scaffolding.');
    throw new Error(
      'Scaffolding failed: Missing project ID or generated structure.'
    );
  }

  const projectDir = path.join(process.cwd(), 'generated_projects', projectId);

  try {
    await fs.mkdir(projectDir, { recursive: true });
    logger.info(`Created project directory: ${projectDir}`);

    // Create basic file structure (e.g., package.json, tsconfig.json)
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: `project-${projectId}`,
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: {
            start: 'node dist/index.js',
            build: 'tsc',
          },
          dependencies: {
            // Add common dependencies here, e.g., express, react, etc.
          },
        },
        null,
        2
      )
    );
    logger.info('Created package.json');

    await fs.writeFile(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ES2022',
            lib: ['ES2022', 'DOM'],
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            outDir: 'dist',
          },
          include: ['src/**/*'],
          exclude: ['node_modules'],
        },
        null,
        2
      )
    );
    logger.info('Created tsconfig.json');

    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    logger.info('Created src directory');

    // Placeholder for index.ts or index.js
    await fs.writeFile(
      path.join(projectDir, 'src', 'index.ts'),
      'console.log("Project scaffolded!");'
    );
    logger.info('Created src/index.ts');

    logger.info('Project scaffolding completed.');
    return { projectPath: projectDir };
  } catch (error) {
    logger.error(`Error during project scaffolding: ${error}`);
    throw error;
  }
}
