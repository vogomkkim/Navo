export const generateImage = {
    name: 'generateImage',
    deps: [],
    async run(ctx) {
        ctx.logger.info('Generating image...');
        await delay(200);
        return { imageUrl: 'https://example.com/generated.jpg' };
    },
};
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
