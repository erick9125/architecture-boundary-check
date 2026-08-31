import fs from 'node:fs/promises';
import path from 'node:path';
import * as ts from 'typescript';
import type { DependencyAnalyzer, ProjectContext } from '../dependency-analyzer.js';
import { DependencyGraph } from '../../core/graph/dependency-graph.js';
import { toPosixPath } from '../../core/paths.js';
import { extractImports } from './import-extractor.js';
import { resolveImportedModule } from './module-resolver.js';
import { isSourceFile } from './project-discovery.js';
import { loadTsConfig } from './tsconfig-loader.js';

export class TypeScriptDependencyAnalyzer implements DependencyAnalyzer {
  async analyze(project: ProjectContext): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    const projectRoot = path.resolve(project.rootDirectory);
    const { compilerOptions } = loadTsConfig(projectRoot);
    const host = ts.createCompilerHost(compilerOptions, true);
    const scriptTarget = compilerOptions.target ?? ts.ScriptTarget.ES2022;

    for (const file of project.files) {
      graph.addFile(toProjectRelative(file, projectRoot));
    }

    for (const file of project.files) {
      const absoluteFile = path.resolve(file);
      const content = await fs.readFile(absoluteFile, 'utf8');
      const sourceFile = ts.createSourceFile(
        absoluteFile,
        content,
        scriptTarget,
        true,
        scriptKindFor(absoluteFile),
      );

      const sourceRelative = toProjectRelative(absoluteFile, projectRoot);

      for (const extracted of extractImports(sourceFile)) {
        const resolved = resolveImportedModule(
          extracted.specifier,
          absoluteFile,
          compilerOptions,
          host,
          projectRoot,
        );

        if (!resolved || !isSourceFile(resolved)) {
          continue;
        }

        const realTarget = await fs.realpath(resolved).catch(() => resolved);
        if (!isInsideRoot(realTarget, projectRoot)) {
          continue;
        }

        graph.addDependency(sourceRelative, toProjectRelative(realTarget, projectRoot), {
          specifier: extracted.specifier,
          kind: 'static-import',
          line: extracted.line,
          column: extracted.column,
        });
      }
    }

    return graph;
  }
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
