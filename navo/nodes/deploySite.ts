import type { GraphNode } from '../core/node.js';
import type { BuildPageOutput } from '../data/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createWriteStream } from 'node:fs';
import { db } from '../db/db.js'; // Added import
import { publishDeploys } from '../db/schema.js'; // Added import

export const deploySite: GraphNode = {
  name: 'deploySite',
  deps: ['buildPage'],
  async run(ctx) {
    ctx.logger.info('Deploying site to Vercel...');
    const htmlContent = (
      ctx.outputs.get('buildPage') as BuildPageOutput | undefined
    )?.html;

    if (!htmlContent) {
      ctx.logger.error('No HTML content found from buildPage node.');
      throw new Error('Deployment failed: No HTML content.');
    }

    const vercelApiToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectName =
      process.env.VERCEL_PROJECT_NAME || 'navo-generated-site'; // Default project name

    if (!vercelApiToken) {
      ctx.logger.error('VERCEL_API_TOKEN environment variable is not set.');
      throw new Error('Vercel deployment failed: API token missing.');
    }

    try {
      // Create a temporary directory and write the HTML content to it
      const tempDir = path.join(process.cwd(), 'temp_vercel_deploy');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'index.html'), htmlContent);

      // Prepare the deployment payload
      const deploymentPayload = {
        name: vercelProjectName,
        files: [
          {
            file: 'index.html',
            data: htmlContent,
          },
        ],
        project: vercelProjectName, // Link to an existing project or create a new one
      };

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vercelApiToken}`,
        },
        body: JSON.stringify(deploymentPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        ctx.logger.error(
          `Vercel deployment failed: ${data.error?.message || response.statusText}`
        );
        throw new Error(
          `Vercel deployment failed: ${data.error?.message || response.statusText}`
        );
      }

      const deploymentUrl = data.url;
      ctx.logger.info(
        `Successfully deployed to Vercel: https://${deploymentUrl}`
      );

      // Store deployment information in the database
      // TODO: Replace with actual projectId from context
      const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder Project ID
      await db.insert(publishDeploys).values({
        projectId: projectId,
        url: `https://${deploymentUrl}`,
        status: 'success', // Assuming success for now
        vercelDeploymentId: data.id, // Store the Vercel deployment ID
      });

      // Clean up the temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });

      return { url: `https://${deploymentUrl}` };
    } catch (error) {
      ctx.logger.error(`Vercel deployment failed: ${error}`);
      throw error;
    }
  },
};
