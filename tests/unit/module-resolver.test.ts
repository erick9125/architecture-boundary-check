import path from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { resolveImportedModule } from '../../src/analyzers/typescript/module-resolver.js';
import { loadTsConfig } from '../../src/analyzers/typescript/tsconfig-loader.js';
import { toPosixPath } from '../../src/core/paths.js';
import { fixtureDir } from '../helpers/fixtures.js';

/**
 * Resolution decides what reaches the dependency graph at all, and until now
 * it was only ever observed through a finished analysis. A specifier it
 * declines leaves no trace in the report: the edge simply is not there, and
 * the run passes.
 */
function resolveIn(
  fixture: string,
  specifier: string,
  containing: string,
): string | undefined {
  const root = fixtureDir(fixture);
  const { compilerOptions } = loadTsConfig(root);
  const host = ts.createCompilerHost(compilerOptions, true);

  return resolveImportedModule(
    specifier,
    path.join(root, containing),
    compilerOptions,
    host,
    root,
  );
}

function relativeTo(fixture: string, resolved: string | undefined): string | undefined {
  if (resolved === undefined) {
    return undefined;
  }

  return toPosixPath(path.relative(fixtureDir(fixture), resolved));
}

describe('resolveImportedModule', () => {
  it('resolves a relative specifier to a file in the project', () => {
    const resolved = resolveIn(
      'valid-clean',
      '../domain/order',
      'src/application/create-order.ts',
    );

    expect(relativeTo('valid-clean', resolved)).toBe('src/domain/order.ts');
  });

  it('resolves a tsconfig path alias', () => {
    const resolved = resolveIn(
      'aliases',
      '@/domain/order',
      'src/application/create-order.ts',
    );

    expect(relativeTo('aliases', resolved)).toBe('src/domain/order.ts');
  });

  /**
   * `yaml` is a real dependency of this package, so TypeScript resolves it to
   * a file inside node_modules and the external-library filter is what turns
   * it away. A specifier nothing installs would be declined for merely failing
   * to resolve, which proves nothing about the filter.
   */
  it('declines a bare specifier that resolves into node_modules', () => {
    expect(
      resolveIn('external-packages', 'yaml', 'src/domain/order.ts'),
    ).toBeUndefined();
  });

  it('declines a specifier it cannot resolve at all', () => {
    expect(
      resolveIn('valid-clean', './does-not-exist', 'src/domain/order.ts'),
    ).toBeUndefined();
  });

  /**
   * TypeScript resolves this one to a real file in a sibling fixture, so the
   * containment check is the only thing standing between the analysis and a
   * directory it was never pointed at.
   */
  it('declines a relative specifier that climbs out of the project root', () => {
    expect(
      resolveIn(
        'valid-clean',
        '../../../aliases/src/domain/order',
        'src/domain/order.ts',
      ),
    ).toBeUndefined();
  });

  it('declines a node builtin', () => {
    expect(
      resolveIn('valid-clean', 'node:path', 'src/domain/order.ts'),
    ).toBeUndefined();
  });
});
