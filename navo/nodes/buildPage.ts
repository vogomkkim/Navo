import type { GraphNode } from '../core/node.js';

export const buildPage: GraphNode = {
  name: 'buildPage',
  deps: ['writeCopy', 'generateImage'],
  async run(ctx) {
    ctx.logger.info('Building page...');
    const copy = ctx.outputs.get('writeCopy') as { headline: string } | undefined;
    const image = ctx.outputs.get('generateImage') as { imageUrl: string } | undefined;
    return {
      html: `<section><h1>${copy?.headline ?? ''}</h1><img src="${image?.imageUrl ?? ''}" /></section>`,
    };
  },
};