import fs from 'node:fs/promises';
import path from 'node:path';
import * as ts from 'typescript';
import type { DependencyAnalyzer, ProjectContext } from '../dependency-analyzer.js';
import { DependencyGraph } from '../../core/graph/dependency-graph.js';
import { normalizeRelativePath, toPosixPath } from '../../core/paths.js';
import { extractImports } from './import-extractor.js';
import { resolveImportedModule } from './module-resolver.js';
import { isSourceFile } from './project-discovery.js';
import { loadTsConfig } from './tsconfig-loader.js';

/**
 * How many files are read at once. Unbounded `Promise.all` over a large
 * repository opens a descriptor per file and starts failing with EMFILE, so the
 * reads overlap in a fixed-width window instead.
 */
const READ_CONCURRENCY = 16;

interface ResolvedEdge {
  readonly target: string;
  readonly specifier: string;
  readonly line: number;
  readonly column: number;
}

interface AnalyzedFile {
  readonly source: string;
  readonly edges: readonly ResolvedEdge[];
}

export class TypeScriptDependencyAnalyzer implements DependencyAnalyzer {
  async analyze(project: ProjectContext): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    const projectRoot = path.resolve(project.rootDirectory);
    const { compilerOptions } = loadTsConfig(projectRoot);
    const host = ts.createCompilerHost(compilerOptions, true);
    const scriptTarget = compilerOptions.target ?? ts.ScriptTarget.ES2022;

    // Resolution walks the filesystem for every specifier, and the same
    // directories answer the same questions over and over across a project.
    // One cache for the whole run keeps that work down to the first miss.
    const resolutionCache = ts.createModuleResolutionCache(
      projectRoot,
      (fileName) =>
        ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
      compilerOptions,
    );

    // Only these files exist as far as the analysis is concerned. An import
    // reaching outside the set — excluded, gitignored, or below another scan
    // root — must not pull a file back in that the user asked to leave out.
    const discovered = new Set<string>();
    for (const file of project.files) {
      const relative = normalizeRelativePath(toProjectRelative(file, projectRoot));
      discovered.add(relative);
      graph.addFile(relative);
    }

    const analyzed = await mapWithConcurrency(
      project.files,
      READ_CONCURRENCY,
      (file) =>
        this.analyzeFile({
          file,
          projectRoot,
          compilerOptions,
          host,
          resolutionCache,
          scriptTarget,
          discovered,
        }),
    );

    // Added in discovery order rather than completion order, so the report does
    // not reshuffle itself between runs of the same unchanged project.
    for (const { source, edges } of analyzed) {
      for (const edge of edges) {
        graph.addDependency(source, edge.target, {
          specifier: edge.specifier,
          kind: 'static-import',
          line: edge.line,
          column: edge.column,
        });
      }
    }

    return graph;
  }

  private async analyzeFile(context: {
    readonly file: string;
    readonly projectRoot: string;
    readonly compilerOptions: ts.CompilerOptions;
    readonly host: ts.ModuleResolutionHost;
    readonly resolutionCache: ts.ModuleResolutionCache;
    readonly scriptTarget: ts.ScriptTarget;
    readonly discovered: ReadonlySet<string>;
  }): Promise<AnalyzedFile> {
    const absoluteFile = path.resolve(context.file);
    const content = await fs.readFile(absoluteFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      absoluteFile,
      content,
      context.scriptTarget,
      true,
      scriptKindFor(absoluteFile),
    );

    // Normalized like the discovered set and the resolved targets are. Leaving
    // one of the three in a different form is how an edge ends up hanging off a
    // node that no other stage recognizes.
    const source = normalizeRelativePath(
      toProjectRelative(absoluteFile, context.projectRoot),
    );

    const edges: ResolvedEdge[] = [];

    for (const extracted of extractImports(sourceFile)) {
      const resolved = resolveImportedModule(
        extracted.specifier,
        absoluteFile,
        context.compilerOptions,
        context.host,
        context.projectRoot,
        context.resolutionCache,
      );

      if (!resolved || !isSourceFile(resolved)) {
        continue;
      }

      const realTarget = await fs.realpath(resolved).catch(() => resolved);
      if (!isInsideRoot(realTarget, context.projectRoot)) {
        continue;
      }

      const target = normalizeRelativePath(
        toProjectRelative(realTarget, context.projectRoot),
      );

      if (!context.discovered.has(target)) {
        continue;
      }

      edges.push({
        target,
        specifier: extracted.specifier,
        line: extracted.line,
        column: extracted.column,
      });
    }

    return { source, edges };
  }
}

/**
 * Runs `worker` over every item with at most `limit` in flight, returning the
 * results in the order the items came in.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const run = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;

      const item = items[index];
      if (item === undefined) {
        return;
      }

      results[index] = await worker(item);
    }
  };

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => run(),
  );

  await Promise.all(workers);
  return results;
}

function toProjectRelative(filePath: string, projectRoot: string): string {
  return toPosixPath(path.relative(projectRoot, filePath));
}

function isInsideRoot(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function scriptKindFor(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  if (filePath.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  if (
    filePath.endsWith('.js') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.cjs')
  ) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}
