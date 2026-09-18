import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findConfigFile,
  loadConfigFile,
  loadConfigFromDirectory,
} from '../../src/config/loader.js';
import { ConfigurationError } from '../../src/config/errors.js';
import { fixtureDir } from '../helpers/fixtures.js';

describe('findConfigFile', () => {
  it('finds the yml candidate', () => {
    const found = findConfigFile(fixtureDir('valid-clean'));

    expect(found && path.basename(found)).toBe('architecture-boundary.yml');
  });

  it('finds the json candidate when no yml is present', () => {
    const found = findConfigFile(fixtureDir('json-config'));

    expect(found && path.basename(found)).toBe('architecture-boundary.json');
  });

  it('returns undefined when no candidate exists', () => {
    expect(findConfigFile(fixtureDir('valid-clean/src'))).toBeUndefined();
  });
});

describe('loadConfigFile', () => {
  // The loader branches on the extension, and every fixture but this one is
  // YAML, so the JSON.parse path had never been taken by a test.
  it('parses a json configuration', () => {
    const config = loadConfigFile(
      path.join(fixtureDir('json-config'), 'architecture-boundary.json'),
    );

    expect(config.root).toBe('src');
    expect(config.layers.map((layer) => layer.name)).toEqual([
      'domain',
      'application',
    ]);
  });

  it('rejects a json file that is not an architecture configuration', () => {
    const configPath = path.join(fixtureDir('json-config'), 'tsconfig.json');

    expect(() => loadConfigFile(configPath)).toThrow(ConfigurationError);
  });

  it('reports a missing file rather than throwing a read error', () => {
    expect(() => loadConfigFile(path.join(fixtureDir('json-config'), 'nope.yml'))).toThrow(
      /not found/,
    );
  });
});

describe('loadConfigFromDirectory', () => {
  it('discovers the configuration when none is named', () => {
    const loaded = loadConfigFromDirectory(fixtureDir('json-config'), undefined);

    expect(path.basename(loaded.configPath)).toBe('architecture-boundary.json');
    expect(loaded.config.version).toBe(1);
  });

  it('resolves an explicit path against the working directory', () => {
    const loaded = loadConfigFromDirectory(
      fixtureDir('json-config'),
      'architecture-boundary.json',
    );

    expect(loaded.config.rules).toHaveLength(1);
  });

  it('names the candidates it looked for when there is no configuration', () => {
    expect(() =>
      loadConfigFromDirectory(fixtureDir('json-config/src'), undefined),
    ).toThrow(/architecture-boundary\.yml/);
  });
});
