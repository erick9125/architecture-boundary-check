import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../src/config/errors.js';
import { validateConfig } from '../../src/config/validator.js';

const valid = {
  version: 1,
  layers: [
    { name: 'domain', paths: ['src/domain/**'] },
    { name: 'infrastructure', paths: ['src/infrastructure/**'] },
  ],
  rules: [
    {
      from: 'domain',
      cannotDependOn: ['infrastructure'],
    },
  ],
};

describe('validateConfig', () => {
  it('accepts a valid configuration', () => {
    expect(validateConfig(valid).layers).toHaveLength(2);
  });

  it('rejects unknown layers in rules', () => {
    expect(() =>
      validateConfig({
        ...valid,
        rules: [{ from: 'presentation', cannotDependOn: ['domain'] }],
      }),
    ).toThrow(ConfigurationError);
  });

  it('rejects duplicate layer names', () => {
    expect(() =>
      validateConfig({
        ...valid,
        layers: [
          { name: 'domain', paths: ['src/domain/**'] },
          { name: 'domain', paths: ['src/other/**'] },
        ],
      }),
    ).toThrow(/Duplicate layer name/);
  });

  it('rejects empty layer paths', () => {
    expect(() =>
      validateConfig({
        ...valid,
        layers: [{ name: 'domain', paths: [] }],
      }),
    ).toThrow(/paths must not be empty/);
  });

  it('rejects a rule without from', () => {
    expect(() =>
      validateConfig({
        ...valid,
        rules: [{ cannotDependOn: ['infrastructure'] }],
      }),
    ).toThrow(/from/);
  });

  it('rejects cannotDependOn and canOnlyDependOn on the same rule', () => {
    expect(() =>
      validateConfig({
        ...valid,
        rules: [
          {
            from: 'domain',
            cannotDependOn: ['infrastructure'],
            canOnlyDependOn: ['domain'],
          },
        ],
      }),
    ).toThrow(/cannot use cannotDependOn and canOnlyDependOn/);
  });

  it('rejects expired exceptions', () => {
    expect(() =>
      validateConfig(
        {
          ...valid,
          exceptions: [
            {
              from: 'domain',
              to: 'infrastructure',
              reason: 'Legacy migration',
              expires: '2020-01-01',
            },
          ],
        },
        { now: new Date('2026-08-27T00:00:00Z') },
      ),
    ).toThrow(/Architecture exception expired/);
  });

  it('accepts an exception that has not expired', () => {
    const config = validateConfig(
      {
        ...valid,
        exceptions: [
          {
            from: 'domain',
            to: 'infrastructure',
            reason: 'Legacy migration',
            expires: '2026-12-31',
          },
        ],
      },
      { now: new Date('2026-08-27T00:00:00Z') },
    );

    expect(config.exceptions?.[0]?.expires).toBe('2026-12-31');
  });
});
