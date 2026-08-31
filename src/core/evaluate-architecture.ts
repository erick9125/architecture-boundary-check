import type { ArchitectureModel } from './architecture/architecture-model.js';
import { LayerResolver } from './architecture/layer-resolver.js';
import { detectCycles } from './graph/cycle-detector.js';
import type { DependencyGraph } from './graph/dependency-graph.js';
import type { ArchitectureAnalysisResult } from './results/analysis-result.js';
import { evaluateRules } from './rules/rule-evaluator.js';

export function evaluateArchitecture(
  graph: DependencyGraph,
  model: ArchitectureModel,
): ArchitectureAnalysisResult {
  const resolver = new LayerResolver(model.layers, model.root);
  resolver.classify(graph.getFiles());

  return {
    filesAnalyzed: graph.getFiles().length,
    dependenciesAnalyzed: graph.getDependencies().length,
    violations: evaluateRules(graph, model, resolver),
    cycles: detectCycles(graph),
  };
}
