import type { GraphNode } from './node';

export function validateDag(nodes: GraphNode[]): void {
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));

  for (const node of nodes) {
    const deps = node.deps ?? [];
    for (const dep of deps) {
      if (!nameToNode.has(dep)) {
        throw new Error(`Node ${node.name} depends on unknown node ${dep}`);
      }
    }
  }
}

export function topologicalGroups(nodes: GraphNode[]): string[][] {
  const nameToNode = new Map(nodes.map((n) => [n.name, n]));
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  // 초기화
  for (const node of nodes) {
    inDegree.set(node.name, 0);
    graph.set(node.name, []);
  }

  // 의존성 그래프 구성
  for (const node of nodes) {
    const deps = node.deps ?? [];
    for (const dep of deps) {
      inDegree.set(node.name, (inDegree.get(node.name) ?? 0) + 1);
      graph.get(dep)!.push(node.name);
    }
  }

  const groups: string[][] = [];
  const queue: string[] = [];

  // 진입 차수가 0인 노드들을 큐에 추가
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const currentGroup: string[] = [];
    const nextQueue: string[] = [];

    for (const name of queue) {
      currentGroup.push(name);

      // 의존하는 노드들의 진입 차수 감소
      for (const dependent of graph.get(name)!) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          nextQueue.push(dependent);
        }
      }
    }

    groups.push(currentGroup);
    queue.splice(0, queue.length, ...nextQueue);
  }

  return groups;
}
