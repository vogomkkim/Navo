export const deploySite = {
    name: 'deploySite',
    deps: ['buildPage'],
    async run(ctx) {
        ctx.logger.info('Deploying site...');
        await delay(100);
        return { url: 'https://demo.navo.local' };
    },
};
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
