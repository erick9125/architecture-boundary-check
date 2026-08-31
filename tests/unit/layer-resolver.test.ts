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
});
