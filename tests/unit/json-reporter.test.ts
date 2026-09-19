import { describe, expect, it } from 'vitest';
import type { ArchitectureConfig } from '../../src/config/config.js';
import type { ArchitectureAnalysisResult } from '../../src/core/results/analysis-result.js';
import { formatJsonReport } from '../../src/cli/output/json-reporter.js';

function createConfig(overrides: Partial<ArchitectureConfig> = {}): ArchitectureConfig {
  return {
    version: 1,
    layers: [{ name: 'domain', paths: ['src/domain/**'] }],
    rules: [],
    ...overrides,
  };
}

function createResult(
  overrides: Partial<ArchitectureAnalysisResult> = {},
): ArchitectureAnalysisResult {
  return {
    filesAnalyzed: 3,
    filesClassified: 3,
    dependenciesAnalyzed: 2,
    violations: [],
    cycles: [],
    ...overrides,
  };
}

function report(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
): Record<string, unknown> {
  return JSON.parse(formatJsonReport(result, config)) as Record<string, unknown>;
}

describe('formatJsonReport', () => {
  it('marks a clean run as passed', () => {
    expect(report(createResult(), createConfig()).passed).toBe(true);
  });

  it('marks a run with violations as not passed', () => {
    const result = createResult({
      violations: [
        {
          sourceFile: 'src/domain/order.ts',
          targetFile: 'src/infrastructure/order.repository.ts',
          sourceLayer: 'domain',
          targetLayer: 'infrastructure',
          rule: 'domain cannot depend on infrastructure',
          importSpecifier: '../infrastructure/order.repository',
          line: 1,
          column: 1,
        },
      ],
    });

    expect(report(result, createConfig()).passed).toBe(false);
  });

  /**
   * The case the verdict exists for. Nothing in the violations array says the
   * run failed, and what decides it — whether cycles are forbidden — lives in
   * the configuration, which the reader of this JSON does not have.
   */
  it('marks a forbidden cycle as not passed even with no violations', () => {
    const result = createResult({ cycles: [{ files: ['src/a.ts', 'src/b.ts'] }] });
    const parsed = report(result, createConfig({ cycles: { forbidden: true } }));

    expect(parsed.violations).toEqual([]);
    expect(parsed.passed).toBe(false);
    expect(parsed.cyclesForbidden).toBe(true);
  });

  it('keeps a tolerated cycle out of the verdict', () => {
    const result = createResult({ cycles: [{ files: ['src/a.ts', 'src/b.ts'] }] });
    const parsed = report(result, createConfig({ cycles: { forbidden: false } }));

    expect(parsed.passed).toBe(true);
    expect(parsed.cyclesForbidden).toBe(false);
  });

  it('ends with a newline', () => {
    expect(formatJsonReport(createResult(), createConfig()).endsWith('\n')).toBe(true);
  });
});

describe('json reporter classification count', () => {
  it('carries the classified count beside the file count', () => {
    const output = report(
      createResult({ filesAnalyzed: 42, filesClassified: 40 }),
      createConfig(),
    );

    expect(output.files).toBe(42);
    expect(output.filesClassified).toBe(40);
  });
});
