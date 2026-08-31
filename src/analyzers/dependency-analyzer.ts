import type { DependencyGraph } from '../core/graph/dependency-graph.js';

export interface ProjectContext {
  readonly rootDirectory: string;
  readonly files: readonly string[];
}

export interface DependencyAnalyzer {
  analyze(project: ProjectContext): Promise<DependencyGraph>;
}
