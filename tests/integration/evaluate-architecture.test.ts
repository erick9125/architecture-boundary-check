import { describe, expect, it } from 'vitest';
import { evaluateArchitecture } from '../../src/core/evaluate-architecture.js';
import { DependencyGraph } from '../../src/core/graph/dependency-graph.js';
import { createModel } from '../helpers/model.js';

describe('evaluateArchitecture', () => {
  it('reports a domain → infrastructure violation from a manual graph', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/domain/order.ts',
      'src/infrastructure/order.repository.ts',
      {
        specifier: '../infrastructure/order.repository',
        kind: 'static-import',
        line: 1,
        column: 1,
      },
    );

    const result = evaluateArchitecture(graph, createModel());

    expect(result.filesAnalyzed).toBe(2);
    expect(result.dependenciesAnalyzed).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({
      sourceFile: 'src/domain/order.ts',
      targetFile: 'src/infrastructure/order.repository.ts',
      sourceLayer: 'domain',
      targetLayer: 'infrastructure',
      rule: 'domain cannot depend on infrastructure',
    });
  });

  it('allows application → domain and infrastructure → domain', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/application/create-order.ts',
      'src/domain/order.ts',
      { specifier: '../domain/order', kind: 'static-import' },
    );
    graph.addDependency(
      'src/infrastructure/order.repository.ts',
      'src/domain/order.ts',
      { specifier: '../domain/order', kind: 'static-import' },
    );

    const result = evaluateArchitecture(graph, createModel());
    expect(result.violations).toEqual([]);
  });
});
