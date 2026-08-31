import { describe, expect, it } from 'vitest';
import { formatConsoleReport, hasFailures } from '../../src/cli/output/console-reporter.js';
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
          dependenciesAnalyzed: 1,
          violations: [],
          cycles: [{ files: ['a.ts', 'b.ts'] }],
        },
        { ...config, cycles: { forbidden: true } },
      ),
    ).toBe(true);
  });
});
