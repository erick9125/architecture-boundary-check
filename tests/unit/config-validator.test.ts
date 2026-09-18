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

  // A key the validator does not read is a key that does nothing. Accepting it
  // turns a typo into a silently weaker check.
  it('rejects an unknown top-level key', () => {
    expect(() => validateConfig({ ...valid, excludes: ['dist/**'] })).toThrow(
      /unknown key: excludes/,
    );
  });

  it('names every unknown key it found', () => {
    expect(() =>
      validateConfig({ ...valid, excludes: [], layres: [] }),
    ).toThrow(/unknown keys: excludes, layres/);
  });

  it('rejects an unknown key inside an exception', () => {
    expect(() =>
      validateConfig({
        ...valid,
        exceptions: [
          {
            from: 'domain',
            to: 'infrastructure',
            sources: ['src/domain/legacy.ts'],
          },
        ],
      }),
    ).toThrow(/exceptions\[0\] has unknown key: sources/);
  });

  it('rejects an unknown key inside a layer', () => {
    expect(() =>
      validateConfig({
        ...valid,
        layers: [{ name: 'domain', paths: ['src/domain/**'], glob: '*' }],
      }),
    ).toThrow(/layers\[0\] has unknown key: glob/);
  });

  // The shape is right and the date is not. String comparison never places it
  // before today, so the exception it guards would never expire.
  it('rejects an expiry date that is not a real date', () => {
    expect(() =>
      validateConfig({
        ...valid,
        exceptions: [
          { from: 'domain', to: 'infrastructure', expires: '2026-13-45' },
        ],
      }),
    ).toThrow(/is not a real date/);
  });

  it('rejects the 31st of a thirty-day month', () => {
    expect(() =>
      validateConfig({
        ...valid,
        exceptions: [
          { from: 'domain', to: 'infrastructure', expires: '2026-04-31' },
        ],
      }),
    ).toThrow(ConfigurationError);
  });

  it('accepts a leap day in a leap year', () => {
    const config = validateConfig(
      {
        ...valid,
        exceptions: [
          { from: 'domain', to: 'infrastructure', expires: '2028-02-29' },
        ],
      },
      { now: new Date('2026-01-01T00:00:00Z') },
    );

    expect(config.exceptions?.[0]?.expires).toBe('2028-02-29');
  });

  it('rejects a leap day in a common year', () => {
    expect(() =>
      validateConfig({
        ...valid,
        exceptions: [
          { from: 'domain', to: 'infrastructure', expires: '2027-02-29' },
        ],
      }),
    ).toThrow(ConfigurationError);
  });
});
