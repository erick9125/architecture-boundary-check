import fs from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';
import picomatch from 'picomatch';
import { toPosixPath } from '../../core/paths.js';

type IgnoreFilter = ReturnType<typeof ignore>;

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
]);

const DEFAULT_SKIP_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
]);

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
];

export interface DiscoverFilesOptions {
  readonly projectRoot: string;
  readonly scanRoot: string;
  readonly exclude?: readonly string[];
}

export async function discoverSourceFiles(
  options: DiscoverFilesOptions,
): Promise<readonly string[]> {
  const projectRoot = await realExistingPath(options.projectRoot);
  const scanRoot = path.resolve(projectRoot, options.scanRoot);
  const scanRootReal = await realExistingPath(scanRoot);
  const gitIgnore = await loadGitIgnore(projectRoot);
  const exclude = picomatch([...DEFAULT_EXCLUDE, ...(options.exclude ?? [])], {
    dot: true,
  });

  const files: string[] = [];
  await walk(scanRootReal, projectRoot, gitIgnore, exclude, files);
  return files.sort();
}

async function walk(
  directory: string,
  projectRoot: string,
  gitIgnore: IgnoreFilter,
  exclude: (file: string) => boolean,
  files: string[],
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relative = toPosixPath(path.relative(projectRoot, fullPath));

    if (relative === '' || relative.startsWith('..')) {
      continue;
    }

    if (entry.isDirectory() && DEFAULT_SKIP_DIRECTORIES.has(entry.name)) {
      continue;
    }

    if (gitIgnore.ignores(relative) || exclude(relative)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      const realPath = await fs.realpath(fullPath).catch(() => undefined);
      if (!realPath || !isInsideRoot(realPath, projectRoot)) {
        continue;
      }

      const stats = await fs.stat(realPath).catch(() => undefined);
      if (!stats) {
        continue;
      }

      if (stats.isDirectory()) {
        await walk(realPath, projectRoot, gitIgnore, exclude, files);
      } else if (stats.isFile() && isSourceFile(realPath)) {
        files.push(fullPath);
      }

      continue;
    }

    if (entry.isDirectory()) {
      await walk(fullPath, projectRoot, gitIgnore, exclude, files);
      continue;
    }

    if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(fullPath);
    }
  }
}

export function isSourceFile(fileName: string): boolean {
  if (fileName.endsWith('.d.ts') || fileName.endsWith('.d.mts') || fileName.endsWith('.d.cts')) {
    return false;
  }

  return SOURCE_EXTENSIONS.has(path.extname(fileName));
}

async function loadGitIgnore(projectRoot: string): Promise<IgnoreFilter> {
  const ig = ignore();
  ig.add(['node_modules', 'dist', 'build', 'coverage', '.git']);

  try {
    const contents = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf8');
    ig.add(contents);
  } catch {
    // .gitignore is optional in 0.1.
  }

  return ig;
}

async function realExistingPath(target: string): Promise<string> {
  try {
    return await fs.realpath(target);
  } catch {
    return path.resolve(target);
  }
}

function isInsideRoot(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
