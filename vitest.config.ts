import { defineConfig } from 'vitest/config';

/**
 * Modules that hold nothing but `interface` and `type` declarations. They
 * compile to an empty file, so no test can ever execute a line of them, and
 * counting them as uncovered source measures the type system rather than the
 * tests.
 */
const TYPE_ONLY_MODULES = [
  'src/analyzers/dependency-analyzer.ts',
  'src/config/config.ts',
  'src/core/architecture/architecture-model.ts',
  'src/core/architecture/exceptions.ts',
  'src/core/architecture/layer.ts',
  'src/core/graph/dependency-cycle.ts',
  'src/core/graph/dependency.ts',
  'src/core/graph/graph-node.ts',
  'src/core/results/analysis-result.ts',
  'src/core/results/violation.ts',
  'src/core/rules/architecture-rule.ts',
];

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    isolate: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        ...TYPE_ONLY_MODULES,
        'src/**/*.d.ts',
        // The process entry point. `tests/e2e/cli-process.test.ts` drives it,
        // but it runs in a spawned process that this instrumentation does not
        // observe, so it reads as 0% however well it is tested.
        'src/cli/index.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
