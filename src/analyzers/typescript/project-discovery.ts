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
  // A file reachable both directly and through a link would otherwise be
  // analyzed twice and counted twice.
  return [...new Set(files)].sort();
}

/**
 * Traverses the tree iteratively. A directory is enqueued only once, keyed by
 * its real path, so a link pointing back at an ancestor cannot be walked
 * forever. The queue also keeps the traversal off the call stack, which a
 * deeply nested tree would otherwise exhaust.
 */
async function walk(
  scanRoot: string,
  projectRoot: string,
  gitIgnore: IgnoreFilter,
  exclude: (file: string) => boolean,
  files: string[],
): Promise<void> {
  const visited = new Set<string>();
  const pending: string[] = [];
  await enqueueDirectory(scanRoot, visited, pending);

  for (
    let directory = pending.pop();
    directory !== undefined;
    directory = pending.pop()
  ) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
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
          await enqueueDirectory(realPath, visited, pending);
        } else if (stats.isFile() && isSourceFile(realPath)) {
          // The real path, not the link path. The analyzer resolves every import
          // target to its real path, so a file recorded under its link would never
          // match one, and every edge into it would be dropped in silence.
          files.push(realPath);
        }

        continue;
      }

      if (entry.isDirectory()) {
        await enqueueDirectory(fullPath, visited, pending);
        continue;
      }

      if (entry.isFile() && isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
  }
}

/**
 * Queues a directory unless its real path was already queued. Windows reports
 * a junction as a plain directory rather than a link, so every directory is
 * de-duplicated here, not only the ones that arrive through the symlink branch.
 */
async function enqueueDirectory(
  directory: string,
  visited: Set<string>,
  pending: string[],
): Promise<void> {
  const key = await fs.realpath(directory).catch(() => directory);
  if (visited.has(key)) {
    return;
  }

  visited.add(key);
  pending.push(directory);
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

/**
 * Canonical form of the directory the analysis is rooted at.
 *
 * Discovery reports real paths, so every other stage has to measure against the
 * real root too. Passing the uncanonicalized one — a symlinked checkout, a
 * Windows 8.3 short name, `/tmp` on macOS — makes every file look like it sits
 * outside the project, and the analysis silently finds nothing.
 */
export async function resolveProjectRoot(directory: string): Promise<string> {
  return realExistingPath(path.resolve(directory));
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
