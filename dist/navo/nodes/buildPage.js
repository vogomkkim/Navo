export const buildPage = {
    name: 'buildPage',
    deps: ['writeCopy', 'generateImage'],
    async run(ctx) {
        ctx.logger.info('Building page...');
        const copy = ctx.outputs.get('writeCopy');
        const image = ctx.outputs.get('generateImage');
        return {
            html: `<section><h1>${copy?.headline ?? ''}</h1><img src="${image?.imageUrl ?? ''}" /></section>`,
        };
    },
};
