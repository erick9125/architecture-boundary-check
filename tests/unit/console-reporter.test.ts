import { describe, expect, it } from 'vitest';
import { formatConsoleReport } from '../../src/cli/output/console-reporter.js';
import { hasFailures } from '../../src/cli/output/verdict.js';
import type { ArchitectureConfig } from '../../src/config/config.js';

const config: ArchitectureConfig = {
  version: 1,
  layers: [
    { name: 'domain', paths: ['src/domain/**'] },
    { name: 'infrastructure', paths: ['src/infrastructure/**'] },
  ],
  rules: [{ from: 'domain', cannotDependOn: ['infrastructure'] }],
};

describe('console reporter', () => {
  it('renders violation locations with line numbers', () => {
    const output = formatConsoleReport(
      {
        filesAnalyzed: 2,
        filesClassified: 2,
        dependenciesAnalyzed: 1,
        violations: [
          {
            sourceFile: 'src/domain/order.ts',
            targetFile: 'src/infrastructure/order.repository.ts',
            sourceLayer: 'domain',
            targetLayer: 'infrastructure',
            rule: 'domain cannot depend on infrastructure',
            importSpecifier: '../infrastructure/order.repository',
            line: 4,
            column: 1,
          },
        ],
        cycles: [],
      },
      config,
    );

    expect(output).toContain('src/domain/order.ts:4:1');
    expect(output).toContain('Architecture check failed.');
    expect(
      hasFailures(
        {
          filesAnalyzed: 2,
          filesClassified: 2,
          dependenciesAnalyzed: 1,
          violations: [],
          cycles: [{ files: ['a.ts', 'b.ts'] }],
        },
        { ...config, cycles: { forbidden: true } },
      ),
    ).toBe(true);
  });
});

// `Layers` counts what the configuration declares. Without a count of what the
// run actually classified, a report from an inert check is indistinguishable
// from a report from a working one.
describe('console reporter classification count', () => {
  it('reports how many analyzed files landed in a layer', () => {
    const output = formatConsoleReport(
      {
        filesAnalyzed: 42,
        filesClassified: 40,
        dependenciesAnalyzed: 109,
        violations: [],
        cycles: [],
      },
      config,
    );

    expect(output).toMatch(/Files analyzed:\s+42/);
    expect(output).toMatch(/Files classified:\s+40/);
  });
});
