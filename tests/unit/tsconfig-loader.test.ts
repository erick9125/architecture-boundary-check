import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadTsConfig } from '../../src/analyzers/typescript/tsconfig-loader.js';
import { AnalyzerError } from '../../src/core/errors.js';

const createdRoots: string[] = [];

afterEach(async () => {
  for (const root of createdRoots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function projectWith(tsconfig: string): Promise<string> {
  const created = await fs.mkdtemp(path.join(os.tmpdir(), 'abc-tsconfig-'));
  createdRoots.push(created);
  const root = await fs.realpath(created);

  await fs.writeFile(path.join(root, 'tsconfig.json'), tsconfig);
  return root;
}

describe('loadTsConfig', () => {
  it('reads compiler options and reports the config path', async () => {
    const root = await projectWith(
      '{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }',
    );

    const loaded = loadTsConfig(root);

    expect(loaded.configPath).toMatch(/tsconfig\.json$/);
    expect(loaded.compilerOptions.paths).toEqual({ '@/*': ['src/*'] });
    expect(loaded.compilerOptions.noEmit).toBe(true);
  });

  it('defaults allowJs so JavaScript sources are analyzed', async () => {
    const root = await projectWith('{ "compilerOptions": {} }');

    expect(loadTsConfig(root).compilerOptions.allowJs).toBe(true);
  });

  it('fails on malformed JSON', async () => {
    const root = await projectWith('{ "compilerOptions": { ');

    expect(() => loadTsConfig(root)).toThrow(AnalyzerError);
  });

  // Regression: parsed.errors was discarded, so a broken tsconfig produced
  // empty options. Aliases stopped resolving, those imports never reached the
  // graph, and the run passed because it stopped seeing the dependencies.
  it('fails on an invalid compiler option instead of resolving nothing', async () => {
    const root = await projectWith(
      '{ "compilerOptions": { "target": "NotAVersion" } }',
    );

    expect(() => loadTsConfig(root)).toThrow(AnalyzerError);
    expect(() => loadTsConfig(root)).toThrow(/target/i);
  });

  it('fails when the referenced file does not exist', async () => {
    const root = await projectWith('{ "extends": "./missing-base.json" }');

    expect(() => loadTsConfig(root)).toThrow(AnalyzerError);
  });

  // The analyzer brings its own file list, so a config that selects no inputs
  // says nothing about whether its options are usable.
  it('accepts a config that selects no input files', async () => {
    const root = await projectWith(
      '{ "files": [], "compilerOptions": { "baseUrl": "." } }',
    );

    expect(() => loadTsConfig(root)).not.toThrow();
    expect(loadTsConfig(root).compilerOptions.baseUrl).toBeDefined();
  });
});
