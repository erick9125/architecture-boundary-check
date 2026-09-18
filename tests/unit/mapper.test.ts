import { describe, expect, it } from 'vitest';
import type { ArchitectureConfig } from '../../src/config/config.js';
import { configToModel } from '../../src/config/mapper.js';

function createConfig(overrides: Partial<ArchitectureConfig> = {}): ArchitectureConfig {
  return {
    version: 1,
    layers: [{ name: 'domain', paths: ['domain/**'] }],
    rules: [{ from: 'domain', cannotDependOn: ['infrastructure'] }],
    ...overrides,
  };
}

describe('configToModel', () => {
  // These defaults were only ever exercised by fixtures that happened to omit
  // the fields. Nothing said what they should be.
  it('defaults an absent root to the project directory', () => {
    expect(configToModel(createConfig()).root).toBe('.');
  });

  it('keeps an explicit root', () => {
    expect(configToModel(createConfig({ root: 'src' })).root).toBe('src');
  });

  it('defaults absent exceptions and ignore patterns to empty lists', () => {
    const model = configToModel(createConfig());

    expect(model.exceptions).toEqual([]);
    expect(model.ignore).toEqual([]);
  });

  it('treats absent cycles configuration as permitted', () => {
    expect(configToModel(createConfig()).cycles.forbidden).toBe(false);
  });

  it('forbids cycles only when the configuration says so', () => {
    expect(
      configToModel(createConfig({ cycles: { forbidden: true } })).cycles.forbidden,
    ).toBe(true);
    expect(
      configToModel(createConfig({ cycles: {} })).cycles.forbidden,
    ).toBe(false);
  });

  // `paths` in the configuration, `patterns` in the model. A rename this quiet
  // is worth pinning down.
  it('renames layer paths to patterns', () => {
    const model = configToModel(
      createConfig({
        layers: [
          { name: 'domain', paths: ['domain/**'] },
          { name: 'application', paths: ['application/**', 'app/**'] },
        ],
      }),
    );

    expect(model.layers).toEqual([
      { name: 'domain', patterns: ['domain/**'] },
      { name: 'application', patterns: ['application/**', 'app/**'] },
    ]);
  });

  it('passes rules through unchanged', () => {
    const rules = [{ from: 'domain', canOnlyDependOn: ['domain'] }];

    expect(configToModel(createConfig({ rules })).rules).toEqual(rules);
  });
});
