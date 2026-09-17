import { describe, expect, it } from 'vitest';
import { LayerResolver } from '../../src/core/architecture/layer-resolver.js';
import { MultipleLayerMatchError } from '../../src/core/errors.js';

describe('LayerResolver', () => {
  const resolver = new LayerResolver(
    [
      { name: 'domain', patterns: ['domain/**'] },
      { name: 'application', patterns: ['application/**'] },
      { name: 'infrastructure', patterns: ['infrastructure/**'] },
    ],
    'src',
  );

  it('matches an exact glob against a nested path', () => {
    expect(resolver.resolve('src/domain/orders/order.ts')).toBe('domain');
  });

  it('matches nested files under a layer', () => {
    expect(resolver.resolve('src/application/create-order.ts')).toBe(
      'application',
    );
  });

  it('returns unclassified when no layer matches', () => {
    expect(resolver.resolve('src/shared/logger.ts')).toBeUndefined();
  });

  it('throws when a file matches multiple layers', () => {
    const overlapping = new LayerResolver(
      [
        { name: 'shared', patterns: ['src/shared/**'] },
        { name: 'domain', patterns: ['**/domain/**'] },
      ],
      '.',
    );

    expect(() => overlapping.resolve('src/shared/domain/test.ts')).toThrow(
      MultipleLayerMatchError,
    );
  });

  it('matches project-relative globs when nothing matches under the root', () => {
    const projectStyle = new LayerResolver(
      [{ name: 'domain', patterns: ['src/domain/**'] }],
      'src',
    );

    expect(projectStyle.resolve('src/domain/order.ts')).toBe('domain');
  });

  // Regression: both forms were tested in one pass, so `src/**` matched the
  // project-relative path while `domain/**` matched the root-relative one and
  // the file was rejected as ambiguous though only one layer really claims it.
  it('does not report ambiguity across the two path forms', () => {
    const mixedStyles = new LayerResolver(
      [
        { name: 'all-src', patterns: ['src/**'] },
        { name: 'domain', patterns: ['domain/**'] },
      ],
      'src',
    );

    expect(mixedStyles.resolve('src/domain/order.ts')).toBe('domain');
  });

  it('still throws when two layers claim the same root-relative path', () => {
    const genuinelyAmbiguous = new LayerResolver(
      [
        { name: 'domain', patterns: ['domain/**'] },
        { name: 'orders', patterns: ['**/orders/**'] },
      ],
      'src',
    );

    expect(() => genuinelyAmbiguous.resolve('src/domain/orders/order.ts')).toThrow(
      MultipleLayerMatchError,
    );
  });
});
