import type { GraphNode } from '../core/node.js';
import type { BuildPageOutput } from '../data/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createWriteStream } from 'node:fs';

export const deploySite: GraphNode = {
  name: 'deploySite',
  deps: ['buildPage'],
  async run(ctx) {
    ctx.logger.info('Deploying site...');
    const htmlContent = (ctx.outputs.get('buildPage') as BuildPageOutput | undefined)?.html;

    if (!htmlContent) {
      ctx.logger.error('No HTML content found from buildPage node.');
      throw new Error('Deployment failed: No HTML content.');
    }

    const distDir = path.join(process.cwd(), 'dist');
    const filePath = path.join(distDir, 'index.html');

    try {
      await fs.mkdir(distDir, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        const writeStream = createWriteStream(filePath);

        writeStream.on('finish', () => {
          ctx.logger.info(`Successfully deployed to ${filePath}`);
          resolve();
        });

        writeStream.on('error', (error) => {
          ctx.logger.error(`Stream error during deployment: ${error}`);
          reject(error);
        });

        writeStream.write(htmlContent);
        writeStream.end();
      });

      return { url: `file://${filePath}` };
    } catch (error) {
      ctx.logger.error(`Deployment failed: ${error}`);
      throw error;
    }
  },
};
