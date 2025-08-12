import type { GraphNode } from '../core/node';

export const generateImage: GraphNode = {
  name: 'generateImage',
  deps: [],
  async run(ctx) {
    ctx.logger.info('Generating image...');
    await delay(200);
    return { imageUrl: 'https://example.com/generated.jpg' };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}