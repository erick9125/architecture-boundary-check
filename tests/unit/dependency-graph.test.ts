import { describe, expect, it } from 'vitest';
import { DependencyGraph } from '../../src/core/graph/dependency-graph.js';

describe('DependencyGraph', () => {
  it('adds files and unique adjacency edges', () => {
    const graph = new DependencyGraph();
    graph.addFile('src/domain/order.ts');
    graph.addDependency('src/domain/order.ts', 'src/infrastructure/order.repository.ts', {
      specifier: '../infrastructure/order.repository',
      kind: 'static-import',
      line: 1,
      column: 1,
    });
    graph.addDependency('src/domain/order.ts', 'src/infrastructure/order.repository.ts', {
      specifier: '../infrastructure/order.repository',
      kind: 'static-import',
      line: 4,
      column: 1,
    });

    const node = graph.getNode('src/domain/order.ts');
    expect(node?.dependencies).toEqual([
      'src/infrastructure/order.repository.ts',
    ]);
    expect(graph.getDependencies()).toHaveLength(2);
    expect(graph.getFiles()).toEqual([
      'src/domain/order.ts',
      'src/infrastructure/order.repository.ts',
    ]);
  });

  it('normalizes windows separators', () => {
    const graph = new DependencyGraph();
    graph.addFile('src\\domain\\order.ts');

    expect(graph.getNode('src/domain/order.ts')?.file).toBe('src/domain/order.ts');
  });

  // Deduplication moved to a set for speed. The array it mirrors is still what
  // callers iterate, and the cycle report depends on that order not drifting.
  it('keeps adjacency in insertion order while deduplicating', () => {
    const graph = new DependencyGraph();
    const edge = { specifier: './x', kind: 'static-import' } as const;

    graph.addDependency('src/a.ts', 'src/z.ts', edge);
    graph.addDependency('src/a.ts', 'src/b.ts', edge);
    graph.addDependency('src/a.ts', 'src/z.ts', edge);
    graph.addDependency('src/a.ts', 'src/m.ts', edge);

    expect(graph.getAdjacency('src/a.ts')).toEqual([
      'src/z.ts',
      'src/b.ts',
      'src/m.ts',
    ]);
  });

  it('tracks adjacency per source file', () => {
    const graph = new DependencyGraph();
    const edge = { specifier: './x', kind: 'static-import' } as const;

    graph.addDependency('src/a.ts', 'src/shared.ts', edge);
    graph.addDependency('src/b.ts', 'src/shared.ts', edge);

    expect(graph.getAdjacency('src/a.ts')).toEqual(['src/shared.ts']);
    expect(graph.getAdjacency('src/b.ts')).toEqual(['src/shared.ts']);
    expect(graph.getAdjacency('src/shared.ts')).toEqual([]);
  });
});
