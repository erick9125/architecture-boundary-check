import { describe, expect, it } from 'vitest';
import { normalizeRelativePath, toPosixPath } from '../../src/core/paths.js';

describe('toPosixPath', () => {
  it('rewrites windows separators', () => {
    expect(toPosixPath('src\\domain\\order.ts')).toBe('src/domain/order.ts');
  });
});

describe('normalizeRelativePath', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['src/domain/order.ts', 'src/domain/order.ts'],
    ['src\\domain\\order.ts', 'src/domain/order.ts'],
    ['./src/domain/order.ts', 'src/domain/order.ts'],
    ['src//domain///order.ts', 'src/domain/order.ts'],
    ['src/domain/../infrastructure/repo.ts', 'src/infrastructure/repo.ts'],
    ['src/./domain/order.ts', 'src/domain/order.ts'],
    ['', ''],
  ];

  for (const [input, expected] of cases) {
    it(`normalizes ${JSON.stringify(input)}`, () => {
      expect(normalizeRelativePath(input)).toBe(expected);
    });
  }

  // Regression: a `..` with nothing left to consume used to be dropped, which
  // turned a path escaping the project into one that looks like it belongs.
  const escaping: ReadonlyArray<readonly [string, string]> = [
    ['../../etc/passwd', '../../etc/passwd'],
    ['a/../../b', '../b'],
    ['../sibling/file.ts', '../sibling/file.ts'],
    ['src/../../outside.ts', '../outside.ts'],
  ];

  for (const [input, expected] of escaping) {
    it(`keeps the escape visible in ${JSON.stringify(input)}`, () => {
      expect(normalizeRelativePath(input)).toBe(expected);
    });
  }

  it('discards leading parents on an absolute path', () => {
    expect(normalizeRelativePath('/../../etc/passwd')).toBe('/etc/passwd');
  });
});
