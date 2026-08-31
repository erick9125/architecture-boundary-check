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
});
