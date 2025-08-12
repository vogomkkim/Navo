import type { GraphNode } from '../core/node';

export const deploySite: GraphNode = {
  name: 'deploySite',
  deps: ['buildPage'],
  async run(ctx) {
    ctx.logger.info('Deploying site...');
    await delay(100);
    return { url: 'https://demo.navo.local' };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}