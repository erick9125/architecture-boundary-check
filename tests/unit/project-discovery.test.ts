import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverSourceFiles } from '../../src/analyzers/typescript/project-discovery.js';
import { toPosixPath } from '../../src/core/paths.js';

const createdRoots: string[] = [];

afterEach(async () => {
  for (const root of createdRoots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function createProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'abc-discovery-'));
  createdRoots.push(root);

  await fs.mkdir(path.join(root, 'src', 'deep'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'src', 'deep', 'a.ts'),
    'export const a = 1;\n',
  );

  return root;
}

/**
 * `junction` is the only link type Windows creates without elevated rights.
 * POSIX ignores the argument and makes a plain symlink.
 */
async function tryLink(target: string, link: string): Promise<boolean> {
  try {
    await fs.symlink(target, link, 'junction');
    return true;
  } catch {
    return false;
  }
}

function relativePaths(root: string, files: readonly string[]): string[] {
  return files.map((file) => toPosixPath(path.relative(root, file)));
}

describe('discoverSourceFiles', () => {
  it('collects nested source files and skips declaration files', async () => {
    const root = await createProject();
    await fs.writeFile(path.join(root, 'src', 'types.d.ts'), 'export {};\n');
    await fs.writeFile(path.join(root, 'src', 'notes.md'), 'ignored\n');

    const files = await discoverSourceFiles({ projectRoot: root, scanRoot: '.' });

    expect(relativePaths(root, files)).toEqual(['src/deep/a.ts']);
  });

  // Regression: a link pointing back at an ancestor used to recurse forever.
  it('terminates when a link points back at an ancestor directory', async () => {
    const root = await createProject();
    const linked = await tryLink(
      path.join(root, 'src'),
      path.join(root, 'src', 'deep', 'loop'),
    );

    if (!linked) {
      return;
    }

    const files = await discoverSourceFiles({ projectRoot: root, scanRoot: '.' });

    expect(files).toHaveLength(1);
    expect(toPosixPath(files[0] ?? '')).toMatch(/src\/deep\/a\.ts$/);
  });

  it('visits a directory reached through a link only once', async () => {
    const root = await createProject();
    const linked = await tryLink(
      path.join(root, 'src', 'deep'),
      path.join(root, 'mirror'),
    );

    if (!linked) {
      return;
    }

    const files = await discoverSourceFiles({ projectRoot: root, scanRoot: '.' });

    expect(files).toHaveLength(1);
    expect(new Set(files).size).toBe(files.length);
  });
});
