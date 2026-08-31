export { analyzeArchitecture } from './analyze-architecture.js';
export type { AnalyzeArchitectureOptions } from './analyze-architecture.js';

export { evaluateArchitecture } from './core/evaluate-architecture.js';
export { DependencyGraph } from './core/graph/dependency-graph.js';
export { LayerResolver } from './core/architecture/layer-resolver.js';
export { detectCycles } from './core/graph/cycle-detector.js';
export { evaluateRules } from './core/rules/rule-evaluator.js';

export { loadConfigFile, loadConfigFromDirectory, findConfigFile } from './config/loader.js';
export { validateConfig } from './config/validator.js';
export { configToModel } from './config/mapper.js';
export { ConfigurationError } from './config/errors.js';

export { TypeScriptDependencyAnalyzer } from './analyzers/typescript/typescript-analyzer.js';

export { VERSION } from './version.js';
export { EXIT_SUCCESS, EXIT_VIOLATIONS, EXIT_ERROR } from './cli/exit-codes.js';

export type { ArchitectureConfig, LayerConfig } from './config/config.js';
export type { ArchitectureModel } from './core/architecture/architecture-model.js';
export type { Layer } from './core/architecture/layer.js';
export type { ArchitectureRule } from './core/rules/architecture-rule.js';
export type { ArchitectureViolation } from './core/results/violation.js';
export type { ArchitectureAnalysisResult } from './core/results/analysis-result.js';
export type { Dependency } from './core/graph/dependency.js';
export type { DependencyKind } from './core/graph/dependency.js';
export type { GraphNode } from './core/graph/graph-node.js';
export type { DependencyCycle } from './core/graph/dependency-cycle.js';
export type { DependencyAnalyzer, ProjectContext } from './analyzers/dependency-analyzer.js';
export type { ArchitectureException, IgnorePattern } from './core/architecture/exceptions.js';
