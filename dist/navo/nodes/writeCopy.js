export const writeCopy = {
    name: 'writeCopy',
    deps: [],
    async run(ctx) {
        ctx.logger.info('Writing copy...');
        await delay(150);
        return { headline: 'Speak it, see it, ship it.' };
    },
};
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
