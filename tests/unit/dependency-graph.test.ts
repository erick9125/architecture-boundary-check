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
});
