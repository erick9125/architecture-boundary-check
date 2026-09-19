import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/version.js';

/**
 * `VERSION` is what `--version` prints and what the published API exports, and
 * it is written by hand. Nothing else notices when a release bumps
 * package.json and leaves it behind, and a CLI that misreports its own version
 * sends every bug report to the wrong release.
 */
describe('VERSION', () => {
  it('matches the version in package.json', () => {
    const manifest = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { version: string };

    expect(VERSION).toBe(manifest.version);
  });
});
