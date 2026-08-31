import path from 'node:path';
import { TypeScriptDependencyAnalyzer } from './analyzers/typescript/typescript-analyzer.js';
import { discoverSourceFiles } from './analyzers/typescript/project-discovery.js';
import type { ArchitectureAnalysisResult } from './core/results/analysis-result.js';
import { evaluateArchitecture } from './core/evaluate-architecture.js';
import type { ArchitectureConfig } from './config/config.js';
import { configToModel } from './config/mapper.js';

export interface AnalyzeArchitectureOptions {
  readonly rootDirectory: string;
  readonly config: ArchitectureConfig;
}

export async function analyzeArchitecture(
  options: AnalyzeArchitectureOptions,
): Promise<ArchitectureAnalysisResult> {
  const projectRoot = path.resolve(options.rootDirectory);
  const scanRoot = options.config.root ?? '.';
  const files = await discoverSourceFiles({
    projectRoot,
    scanRoot,
    ...(options.config.exclude !== undefined
      ? { exclude: options.config.exclude }
      : {}),
  });

  const analyzer = new TypeScriptDependencyAnalyzer();
  const graph = await analyzer.analyze({
    rootDirectory: projectRoot,
    files,
  });

  return evaluateArchitecture(graph, configToModel(options.config));
}
