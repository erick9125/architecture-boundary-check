import type { DependencyGraph } from './dependency-graph.js';
import type { DependencyCycle } from './dependency-cycle.js';

export function detectCycles(graph: DependencyGraph): readonly DependencyCycle[] {
  const cycles = new Map<string, string[]>();
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  const visit = (file: string): void => {
    if (stack.has(file)) {
      const start = path.indexOf(file);
      if (start >= 0) {
        const cycle = normalizeCycle(path.slice(start));
        const key = cycle.join('\0');
        if (!cycles.has(key)) {
          cycles.set(key, cycle);
        }
      }
      return;
    }

    if (visited.has(file)) {
      return;
    }

    visited.add(file);
    stack.add(file);
    path.push(file);

    for (const dependency of graph.getAdjacency(file)) {
      visit(dependency);
    }

    path.pop();
    stack.delete(file);
  };

  for (const file of graph.getFiles()) {
    visit(file);
  }

  return [...cycles.values()].map((files) => ({ files }));
}

function normalizeCycle(nodes: readonly string[]): string[] {
  if (nodes.length === 0) {
    return [];
  }

  let minIndex = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    const current = nodes[index];
    const min = nodes[minIndex];
    if (current !== undefined && min !== undefined && current < min) {
      minIndex = index;
    }
  }

  return [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
}
