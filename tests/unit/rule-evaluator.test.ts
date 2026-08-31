import { describe, expect, it } from 'vitest';
import { LayerResolver } from '../../src/core/architecture/layer-resolver.js';
import { DependencyGraph } from '../../src/core/graph/dependency-graph.js';
import { evaluateRules } from '../../src/core/rules/rule-evaluator.js';
import { createModel } from '../helpers/model.js';

function evaluate(
  graph: DependencyGraph,
  model = createModel(),
) {
  const resolver = new LayerResolver(model.layers, model.root);
  return evaluateRules(graph, model, resolver);
}

describe('RuleEvaluator', () => {
  it('allows an application file to depend on domain', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/application/create-order.ts',
      'src/domain/order.ts',
      { specifier: '../domain/order', kind: 'static-import' },
    );

    expect(evaluate(graph)).toEqual([]);
  });

  it('flags a forbidden domain → infrastructure dependency', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/domain/order.ts',
      'src/infrastructure/order.repository.ts',
      { specifier: '../infrastructure/order.repository', kind: 'static-import' },
    );

    const violations = evaluate(graph);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('domain cannot depend on infrastructure');
    expect(violations[0]?.sourceLayer).toBe('domain');
    expect(violations[0]?.targetLayer).toBe('infrastructure');
  });

  it('flags a canOnlyDependOn violation', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/application/create-order.ts',
      'src/infrastructure/order.repository.ts',
      { specifier: '../infrastructure/order.repository', kind: 'static-import' },
    );

    const violations = evaluate(
      graph,
      createModel({
        rules: [
          {
            from: 'application',
            canOnlyDependOn: ['domain', 'application'],
          },
        ],
      }),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toContain('can only depend on');
  });

  it('ignores external or unclassified targets', () => {
    const graph = new DependencyGraph();
    graph.addDependency('src/domain/order.ts', 'node_modules/zod/index.js', {
      specifier: 'zod',
      kind: 'static-import',
    });

    expect(evaluate(graph)).toEqual([]);
  });

  it('honors ignore patterns on the source file', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/domain/legacy/order.ts',
      'src/infrastructure/order.repository.ts',
      { specifier: '../../infrastructure/order.repository', kind: 'static-import' },
    );

    const violations = evaluate(
      graph,
      createModel({
        ignore: [{ source: 'src/domain/legacy/**' }],
      }),
    );

    expect(violations).toEqual([]);
  });

  it('honors exceptions for a specific source file', () => {
    const graph = new DependencyGraph();
    graph.addDependency(
      'src/application/legacy-adapter.ts',
      'src/infrastructure/order.repository.ts',
      { specifier: '../infrastructure/order.repository', kind: 'static-import' },
    );

    const violations = evaluate(
      graph,
      createModel({
        exceptions: [
          {
            from: 'application',
            to: 'infrastructure',
            files: ['src/application/legacy-adapter.ts'],
            reason: 'Legacy dependency pending migration',
          },
        ],
      }),
    );

    expect(violations).toEqual([]);
  });
});
