import type { Dependency } from './dependency.js';
import type { GraphNode } from './graph-node.js';
import { normalizeRelativePath } from '../paths.js';

export class DependencyGraph {
  private readonly adjacency = new Map<string, string[]>();
  private readonly dependencyList: Dependency[] = [];
  private readonly fileSet = new Set<string>();

  addFile(file: string): void {
    const normalized = normalizeRelativePath(file);
    if (this.fileSet.has(normalized)) {
      return;
    }

    this.fileSet.add(normalized);
    this.adjacency.set(normalized, []);
  }

  addDependency(
    source: string,
    target: string,
    meta: Pick<Dependency, 'specifier' | 'kind'> &
      Partial<Pick<Dependency, 'line' | 'column'>>,
  ): void {
    const src = normalizeRelativePath(source);
    const tgt = normalizeRelativePath(target);

    this.addFile(src);
    this.addFile(tgt);

    const adjacent = this.adjacency.get(src);
    if (adjacent && !adjacent.includes(tgt)) {
      adjacent.push(tgt);
    }

    const dependency: Dependency = {
      source: src,
      target: tgt,
      specifier: meta.specifier,
      kind: meta.kind,
      ...(meta.line !== undefined ? { line: meta.line } : {}),
      ...(meta.column !== undefined ? { column: meta.column } : {}),
    };

    this.dependencyList.push(dependency);
  }

  getNode(file: string): GraphNode | undefined {
    const normalized = normalizeRelativePath(file);
    const dependencies = this.adjacency.get(normalized);
    if (!dependencies) {
      return undefined;
    }

    return {
      file: normalized,
      dependencies,
    };
  }

  getFiles(): readonly string[] {
    return [...this.fileSet];
  }

  getDependencies(): readonly Dependency[] {
    return this.dependencyList;
  }

  getAdjacency(file: string): readonly string[] {
    const normalized = normalizeRelativePath(file);
    return this.adjacency.get(normalized) ?? [];
  }
}
