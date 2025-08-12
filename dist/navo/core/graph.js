export function validateDag(nodes) {
    const nameSet = new Set(nodes.map((n) => n.name));
    for (const node of nodes) {
        for (const dep of node.deps ?? []) {
            if (!nameSet.has(dep)) {
                throw new Error(`Node ${node.name} depends on missing node ${dep}`);
            }
        }
    }
    // cycle detection via DFS
    const visiting = new Set();
    const visited = new Set();
    const graph = new Map(nodes.map((n) => [n.name, n.deps ?? []]));
    function dfs(name) {
        if (visited.has(name))
            return;
        if (visiting.has(name))
            throw new Error(`Cycle detected at ${name}`);
        visiting.add(name);
        for (const dep of graph.get(name) ?? []) {
            dfs(dep);
        }
        visiting.delete(name);
        visited.add(name);
    }
    for (const node of nodes)
        dfs(node.name);
}
export function topologicalGroups(nodes) {
    // Kahn's algorithm to compute levels/groups for concurrency
    const depsMap = new Map();
    const revDeps = new Map();
    for (const node of nodes) {
        depsMap.set(node.name, new Set(node.deps ?? []));
        for (const dep of node.deps ?? []) {
            if (!revDeps.has(dep))
                revDeps.set(dep, new Set());
            revDeps.get(dep).add(node.name);
        }
    }
    const groups = [];
    while (true) {
        const ready = Array.from(depsMap.entries())
            .filter(([, deps]) => deps.size === 0)
            .map(([name]) => name);
        if (ready.length === 0)
            break;
        groups.push(ready);
        for (const r of ready) {
            depsMap.delete(r);
            for (const child of revDeps.get(r) ?? []) {
                depsMap.get(child).delete(r);
            }
        }
    }
    if (depsMap.size > 0) {
        throw new Error('Cycle detected or unresolved dependencies');
    }
    return groups;
}
