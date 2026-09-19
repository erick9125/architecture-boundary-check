import { describe, expect, it } from 'vitest';
import { preflightFailure } from '../../src/cli/output/preflight.js';
import type { ArchitectureConfig } from '../../src/config/config.js';
import type { ArchitectureAnalysisResult } from '../../src/core/results/analysis-result.js';

function createConfig(overrides: Partial<ArchitectureConfig> = {}): ArchitectureConfig {
  return {
    version: 1,
    layers: [
      { name: 'domain', paths: ['src/domain/**'] },
      { name: 'infrastructure', paths: ['src/infrastructure/**'] },
    ],
    rules: [{ from: 'domain', cannotDependOn: ['infrastructure'] }],
    ...overrides,
  };
}

function createResult(
  overrides: Partial<ArchitectureAnalysisResult> = {},
): ArchitectureAnalysisResult {
  return {
    filesAnalyzed: 4,
    filesClassified: 4,
    dependenciesAnalyzed: 3,
    violations: [],
    cycles: [],
    ...overrides,
  };
}

const context = { rootDirectory: '/project' };

describe('preflight', () => {
  it('passes a run that analyzed and classified files', () => {
    expect(
      preflightFailure(createResult(), createConfig(), context),
    ).toBeUndefined();
  });

  it('refuses a run that analyzed nothing', () => {
    const message = preflightFailure(
      createResult({ filesAnalyzed: 0, filesClassified: 0 }),
      createConfig({ root: 'sorce' }),
      context,
    );

    expect(message).toContain('No source files were analyzed.');
    expect(message).toContain('"sorce"');
  });

  // The exclusions are the other half of the answer to "why is it empty", so
  // the message names them rather than making the reader go looking.
  it('names the exclusions that could explain an empty scan', () => {
    const message = preflightFailure(
      createResult({ filesAnalyzed: 0, filesClassified: 0 }),
      createConfig({ exclude: ['src/**', 'lib/**'] }),
      context,
    );

    expect(message).toContain('Exclusions: src/**, lib/**');
  });

  it('leaves the exclusions line out when there are none', () => {
    const message = preflightFailure(
      createResult({ filesAnalyzed: 0, filesClassified: 0 }),
      createConfig(),
      context,
    );

    expect(message).not.toContain('Exclusions:');
  });

  it('refuses a run where no file reached a layer', () => {
    const message = preflightFailure(
      createResult({ filesAnalyzed: 6, filesClassified: 0 }),
      createConfig(),
      context,
    );

    expect(message).toContain('6 files were analyzed');
    expect(message).toContain('none of them matched a layer');
    expect(message).toContain('src/domain/**');
  });

  // Without rules there is nothing for a classification to feed, so an
  // unclassified project is a legitimate state rather than a broken config.
  it('allows an unclassified project when no rule is configured', () => {
    expect(
      preflightFailure(
        createResult({ filesAnalyzed: 6, filesClassified: 0 }),
        createConfig({ rules: [] }),
        context,
      ),
    ).toBeUndefined();
  });

  // Partial classification is normal: a project may legitimately hold files
  // that belong to no layer.
  it('allows a project where only some files reached a layer', () => {
    expect(
      preflightFailure(
        createResult({ filesAnalyzed: 6, filesClassified: 1 }),
        createConfig(),
        context,
      ),
    ).toBeUndefined();
  });
});
