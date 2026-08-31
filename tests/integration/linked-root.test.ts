import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeArchitecture } from '../../src/analyze-architecture.js';
import { loadConfigFile } from '../../src/config/loader.js';

const createdRoots: string[] = [];

afterEach(async () => {
  for (const root of createdRoots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
});

const CONFIG = `version: 1
root: "src"
layers:
  - name: domain
    paths: ["domain/**"]
  - name: infrastructure
    paths: ["infrastructure/**"]
rules:
  - from: domain
    cannotDependOn: ["infrastructure"]
`;

async function createProject(): Promise<string> {
  const created = await fs.mkdtemp(path.join(os.tmpdir(), 'abc-linked-root-'));
  createdRoots.push(created);
  const root = await fs.realpath(created);

  await fs.mkdir(path.join(root, 'src', 'domain'), { recursive: true });
  await fs.mkdir(path.join(root, 'src', 'infrastructure'), { recursive: true });

  await fs.writeFile(path.join(root, 'architecture-boundary.yml'), CONFIG);
  await fs.writeFile(
    path.join(root, 'tsconfig.json'),
    '{ "compilerOptions": { "module": "Node16", "moduleResolution": "Node16" } }\n',
  );
  await fs.writeFile(
    path.join(root, 'src', 'infrastructure', 'repo.ts'),
    'export const repo = 1;\n',
  );
  await fs.writeFile(
    path.join(root, 'src', 'domain', 'order.ts'),
    "import { repo } from '../infrastructure/repo.js';\nexport const order = repo;\n",
  );

  return root;
}

async function analyzeAt(root: string) {
  const config = loadConfigFile(path.join(root, 'architecture-boundary.yml'));
  return analyzeArchitecture({ rootDirectory: root, config });
}

describe('analyzeArchitecture through a linked root', () => {
  // Regression: discovery canonicalizes the root but the analyzer used the path
  // it was handed, so every file looked like it sat outside the project. A
  // symlinked checkout reported zero dependencies and passed a failing project.
  it('reports the same violations whether the root is real or linked', async () => {
    const real = await createProject();
    const linked = path.join(path.dirname(real), `${path.basename(real)}-link`);

    try {
      await fs.symlink(real, linked, 'junction');
    } catch {
      return;
    }

    createdRoots.push(linked);

    const viaReal = await analyzeAt(real);
    const viaLink = await analyzeAt(linked);

    expect(viaReal.violations).toHaveLength(1);
    expect(viaReal.dependenciesAnalyzed).toBe(1);

    expect(viaLink.filesAnalyzed).toBe(viaReal.filesAnalyzed);
    expect(viaLink.dependenciesAnalyzed).toBe(viaReal.dependenciesAnalyzed);
    expect(viaLink.violations).toEqual(viaReal.violations);
  });
});
