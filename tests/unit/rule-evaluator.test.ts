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

  // Two rules can forbid the same pair — a duplicate, or one list that is a
  // superset of another. The edge is still one edge, and describing it twice
  // inflates the count without adding information.
  it('reports one violation when two rules forbid the same pair', () => {
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
          { from: 'application', cannotDependOn: ['infrastructure'] },
          { from: 'application', cannotDependOn: ['infrastructure', 'domain'] },
        ],
      }),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('application cannot depend on infrastructure');
  });

  it('keeps both reports when two rules describe the edge differently', () => {
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
          { from: 'application', cannotDependOn: ['infrastructure'] },
          { from: 'application', canOnlyDependOn: ['domain'] },
        ],
      }),
    );

    expect(violations).toHaveLength(2);
    expect(new Set(violations.map((violation) => violation.rule)).size).toBe(2);
  });

  // `files` is the documented field and `source` the accepted alias. They have
  // always behaved the same; the tests say so now.
  it('honors an exception declared with files', () => {
    expect(
      exceptionViolations({ files: ['src/application/legacy.ts'] }),
    ).toEqual([]);
  });

  it('honors an exception declared with the source alias', () => {
    expect(
      exceptionViolations({ source: ['src/application/legacy.ts'] }),
    ).toEqual([]);
  });

  it('still reports a file the exception does not cover', () => {
    expect(
      exceptionViolations({ files: ['src/application/other.ts'] }),
    ).toHaveLength(1);
  });
});

function exceptionViolations(
  patterns: { files?: string[]; source?: string[] },
) {
  const graph = new DependencyGraph();
  graph.addDependency(
    'src/application/legacy.ts',
    'src/infrastructure/order.repository.ts',
    { specifier: '../infrastructure/order.repository', kind: 'static-import' },
  );

  return evaluate(
    graph,
    createModel({
      exceptions: [
        { from: 'application', to: 'infrastructure', ...patterns },
      ],
    }),
  );
}
