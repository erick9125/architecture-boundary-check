import { describe, expect, it } from 'vitest';
import { analyzeArchitecture } from '../../src/analyze-architecture.js';
import { loadConfigFile } from '../../src/config/loader.js';
import { fixtureDir } from '../helpers/fixtures.js';
import path from 'node:path';

async function analyzeFixture(name: string) {
  const root = fixtureDir(name);
  const config = loadConfigFile(path.join(root, 'architecture-boundary.yml'));
  return analyzeArchitecture({ rootDirectory: root, config });
}

describe('analyzeArchitecture', () => {
  it('accepts a valid clean architecture fixture', async () => {
    const result = await analyzeFixture('valid-clean');

    expect(result.violations).toEqual([]);
    expect(result.cycles).toEqual([]);
    expect(result.filesAnalyzed).toBeGreaterThanOrEqual(3);
    expect(result.dependenciesAnalyzed).toBeGreaterThanOrEqual(2);
  });

  it('detects domain and application dependencies on infrastructure', async () => {
    const result = await analyzeFixture('invalid-domain-infra');

    expect(result.violations).toHaveLength(2);
    expect(result.violations.map((violation) => violation.rule)).toEqual(
      expect.arrayContaining([
        'domain cannot depend on infrastructure',
        'application cannot depend on infrastructure',
      ]),
    );
    expect(result.violations[0]?.line).toBeDefined();
  });

  it('detects circular dependencies', async () => {
    const result = await analyzeFixture('circular');

    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0]?.files).toEqual([
      'src/a.ts',
      'src/b.ts',
      'src/c.ts',
    ]);
  });

  it('resolves tsconfig path aliases', async () => {
    const result = await analyzeFixture('aliases');

    expect(result.violations).toEqual([]);
    expect(result.dependenciesAnalyzed).toBe(1);
    expect(result.violations).toEqual([]);
  });

  it('treats re-exports as dependencies', async () => {
    const result = await analyzeFixture('reexports');

    expect(result.dependenciesAnalyzed).toBeGreaterThanOrEqual(2);
    expect(result.violations).toEqual([]);
  });

  it('ignores external packages', async () => {
    const result = await analyzeFixture('external-packages');

    expect(result.dependenciesAnalyzed).toBe(0);
    expect(result.violations).toEqual([]);
  });
});
