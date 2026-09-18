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

interface CompiledException {
  readonly from: string;
  readonly to: string;
  readonly coversFile: (sourceFile: string) => boolean;
}

export function evaluateRules(
  graph: DependencyGraph,
  model: ArchitectureModel,
  resolver: LayerResolver,
): readonly ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const reported = new Set<string>();
  const ignoreMatchers = model.ignore.map((pattern) =>
    picomatch(pattern.source, { dot: true }),
  );
  const exceptions = model.exceptions.map(compileException);

  const report = (violation: ArchitectureViolation): void => {
    // One dependency can match several rules — two rules sharing a `from`, or
    // one list that is a superset of another — and every one of them describes
    // it the same way. Counting that edge twice inflates the report without
    // telling the reader anything new. Rules whose descriptions differ still
    // both appear: that is two distinct pieces of information about one edge.
    const identity = identify(violation);
    if (reported.has(identity)) {
      return;
    }

    reported.add(identity);
    violations.push(violation);
  };

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
        if (isExcepted(exceptions, sourceLayer, targetLayer, dependency.source)) {
          continue;
        }

        report(
          toViolation(
            dependency,
            sourceLayer,
            targetLayer,
            describeCannotDependOn(rule, targetLayer),
          ),
        );
      }

      if (matchesCanOnlyDependOn(rule, targetLayer)) {
        if (isExcepted(exceptions, sourceLayer, targetLayer, dependency.source)) {
          continue;
        }

        report(
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

/**
 * Builds each exception's file matcher once.
 *
 * Compiling a glob is not free, and doing it inside the dependency loop paid
 * that cost again for every edge in the project. The ignore patterns above are
 * compiled the same way, once, for the same reason.
 *
 * `files` is the documented field. `source` is kept as an accepted alias: it
 * appeared in earlier documentation, and silently ignoring it would widen the
 * exception to the whole layer pair rather than fail.
 */
function compileException(exception: ArchitectureException): CompiledException {
  const patterns = [...(exception.files ?? []), ...(exception.source ?? [])];

  if (patterns.length === 0) {
    return { from: exception.from, to: exception.to, coversFile: () => true };
  }

  const matchers = patterns.map((pattern) => picomatch(pattern, { dot: true }));

  return {
    from: exception.from,
    to: exception.to,
    coversFile: (sourceFile) => matchers.some((match) => match(sourceFile)),
  };
}

function isExcepted(
  exceptions: readonly CompiledException[],
  sourceLayer: string,
  targetLayer: string,
  sourceFile: string,
): boolean {
  return exceptions.some(
    (exception) =>
      exception.from === sourceLayer &&
      exception.to === targetLayer &&
      exception.coversFile(sourceFile),
  );
}

/**
 * A violation identity that two rules describing the same edge the same way
 * will agree on. JSON quoting keeps the parts apart without inventing a
 * separator that a path or a rule sentence could contain.
 */
function identify(violation: ArchitectureViolation): string {
  return JSON.stringify([
    violation.sourceFile,
    violation.targetFile,
    violation.importSpecifier,
    violation.line ?? null,
    violation.column ?? null,
    violation.rule,
  ]);
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
