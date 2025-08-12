import { validateDag, topologicalGroups } from './graph.js';
export async function runGraph(nodes, baseCtx, options = {}) {
    validateDag(nodes);
    const groups = topologicalGroups(nodes);
    const outputs = new Map();
    const ctx = { ...baseCtx, outputs };
    const nameToNode = new Map(nodes.map((n) => [n.name, n]));
    const perGroupConcurrency = Math.max(1, options.concurrency ?? Infinity);
    for (const group of groups) {
        const queue = [...group];
        const running = [];
        const runOne = async (name) => {
            const node = nameToNode.get(name);
            baseCtx.logger.info(`START ${name}`);
            const start = Date.now();
            try {
                const result = await withTimeout(node.run(ctx), options.timeoutMs);
                outputs.set(name, result);
                baseCtx.logger.info(`DONE ${name}`, { ms: Date.now() - start });
            }
            catch (err) {
                baseCtx.logger.error(`FAIL ${name}`, { error: String(err) });
                throw err;
            }
        };
        while (queue.length > 0 || running.length > 0) {
            while (queue.length > 0 && running.length < perGroupConcurrency) {
                const name = queue.shift();
                const p = runOne(name).then(() => {
                    const idx = running.indexOf(p);
                    if (idx >= 0)
                        running.splice(idx, 1);
                });
                running.push(p);
            }
            if (running.length > 0) {
                await Promise.race(running);
            }
        }
    }
    return outputs;
}
async function withTimeout(p, timeoutMs) {
    if (!timeoutMs || !Number.isFinite(timeoutMs))
        return p;
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
        p.then((v) => {
            clearTimeout(t);
            resolve(v);
        }, (e) => {
            clearTimeout(t);
            reject(e);
        });
    });
}
