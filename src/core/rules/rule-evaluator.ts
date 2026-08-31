import picomatch from 'picomatch';
import type { ArchitectureModel } from '../architecture/architecture-model.js';
import type { ArchitectureException } from '../architecture/exceptions.js';
import type { LayerResolver } from '../architecture/layer-resolver.js';
import type { Dependency } from '../graph/dependency.js';
import type { DependencyGraph } from '../graph/dependency-graph.js';
import type { ArchitectureViolation } from '../results/violation.js';
import {
  describeCanOnlyDependOn,
  matchesCanOnlyDependOn,
} from './can-only-depend-on.rule.js';
import {
  describeCannotDependOn,
  matchesCannotDependOn,
} from './cannot-depend-on.rule.js';

export function evaluateRules(
  graph: DependencyGraph,
  model: ArchitectureModel,
  resolver: LayerResolver,
): readonly ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const ignoreMatchers = model.ignore.map((pattern) =>
    picomatch(pattern.source, { dot: true }),
  );

  for (const dependency of graph.getDependencies()) {
    if (ignoreMatchers.some((match) => match(dependency.source))) {
      continue;
    }

    const sourceLayer = resolver.resolve(dependency.source);
    const targetLayer = resolver.resolve(dependency.target);

    if (sourceLayer === undefined || targetLayer === undefined) {
      continue;
    }

    const matchingRules = model.rules.filter((rule) => rule.from === sourceLayer);

    for (const rule of matchingRules) {
      if (matchesCannotDependOn(rule, targetLayer)) {
        if (isExcepted(model.exceptions, sourceLayer, targetLayer, dependency.source)) {
          continue;
        }

        violations.push(
          toViolation(
            dependency,
            sourceLayer,
            targetLayer,
            describeCannotDependOn(rule, targetLayer),
          ),
        );
      }

      if (matchesCanOnlyDependOn(rule, targetLayer)) {
        if (isExcepted(model.exceptions, sourceLayer, targetLayer, dependency.source)) {
          continue;
        }

        violations.push(
          toViolation(
            dependency,
            sourceLayer,
            targetLayer,
            describeCanOnlyDependOn(rule, targetLayer),
          ),
        );
      }
    }
  }

  return violations;
}

function isExcepted(
  exceptions: readonly ArchitectureException[],
  sourceLayer: string,
  targetLayer: string,
  sourceFile: string,
): boolean {
  return exceptions.some((exception) => {
    if (exception.from !== sourceLayer || exception.to !== targetLayer) {
      return false;
    }

    const filePatterns = [
      ...(exception.source ?? []),
      ...(exception.files ?? []),
    ];

    if (filePatterns.length === 0) {
      return true;
    }

    return filePatterns.some((pattern) =>
      picomatch(pattern, { dot: true })(sourceFile),
    );
  });
}

function toViolation(
  dependency: Dependency,
  sourceLayer: string,
  targetLayer: string,
  rule: string,
): ArchitectureViolation {
  return {
    sourceFile: dependency.source,
    targetFile: dependency.target,
    sourceLayer,
    targetLayer,
    rule,
    importSpecifier: dependency.specifier,
    ...(dependency.line !== undefined ? { line: dependency.line } : {}),
    ...(dependency.column !== undefined ? { column: dependency.column } : {}),
  };
}
