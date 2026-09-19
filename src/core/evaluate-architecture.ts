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
  const files = graph.getFiles();

  // The classification was already being computed and thrown away. Counting it
  // is what lets a caller tell "nothing violates the rules" apart from "no file
  // ever reached a rule".
  const classified = resolver.classify(files);
  let filesClassified = 0;
  for (const layer of classified.values()) {
    if (layer !== undefined) {
      filesClassified += 1;
    }
  }

  return {
    filesAnalyzed: files.length,
    filesClassified,
    dependenciesAnalyzed: graph.getDependencies().length,
    violations: evaluateRules(graph, model, resolver),
    cycles: detectCycles(graph),
  };
}
