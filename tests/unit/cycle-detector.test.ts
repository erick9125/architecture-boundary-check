import { describe, expect, it } from 'vitest';
import { detectCycles } from '../../src/core/graph/cycle-detector.js';
import { DependencyGraph } from '../../src/core/graph/dependency-graph.js';

function edge(graph: DependencyGraph, source: string, target: string): void {
  graph.addDependency(source, target, {
    specifier: `./${target}`,
    kind: 'static-import',
  });
}

describe('CycleDetector', () => {
  it('returns no cycles for an acyclic graph', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'b.ts', 'c.ts');

    expect(detectCycles(graph)).toEqual([]);
  });

  it('detects a two-node cycle', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'b.ts', 'a.ts');

    expect(detectCycles(graph)).toEqual([{ files: ['a.ts', 'b.ts'] }]);
  });

  it('detects a three-node cycle once', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'b.ts', 'c.ts');
    edge(graph, 'c.ts', 'a.ts');

    expect(detectCycles(graph)).toEqual([{ files: ['a.ts', 'b.ts', 'c.ts'] }]);
  });

  it('ignores disconnected acyclic components', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'c.ts', 'd.ts');
    graph.addFile('e.ts');

    expect(detectCycles(graph)).toEqual([]);
  });

  it('reports overlapping cycles as a single component', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'b.ts', 'c.ts');
    edge(graph, 'c.ts', 'a.ts');
    edge(graph, 'a.ts', 'c.ts');

    expect(detectCycles(graph)).toEqual([
      { files: ['a.ts', 'b.ts', 'c.ts'] },
    ]);
  });

  it('detects a file that imports itself', () => {
    const graph = new DependencyGraph();
    edge(graph, 'a.ts', 'a.ts');

    expect(detectCycles(graph)).toEqual([{ files: ['a.ts'] }]);
  });

  it('reports each disjoint component once, in a stable order', () => {
    const graph = new DependencyGraph();
    edge(graph, 'x.ts', 'y.ts');
    edge(graph, 'y.ts', 'x.ts');
    edge(graph, 'a.ts', 'b.ts');
    edge(graph, 'b.ts', 'a.ts');

    expect(detectCycles(graph)).toEqual([
      { files: ['a.ts', 'b.ts'] },
      { files: ['x.ts', 'y.ts'] },
    ]);
  });

  // Regression: the recursive detector blew the call stack on long chains.
  it('handles a chain far deeper than the call stack', () => {
    const graph = new DependencyGraph();
    for (let index = 0; index < 20_000; index += 1) {
      edge(graph, `f${index}.ts`, `f${index + 1}.ts`);
    }

    expect(detectCycles(graph)).toEqual([]);
  });

  it('finds a cycle at the end of a very long chain', () => {
    const graph = new DependencyGraph();
    for (let index = 0; index < 20_000; index += 1) {
      edge(graph, `f${index}.ts`, `f${index + 1}.ts`);
    }
    edge(graph, 'f20000.ts', 'f0.ts');

    expect(detectCycles(graph)).toHaveLength(1);
  });
});
