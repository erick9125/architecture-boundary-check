import type { ArchitectureConfig } from '../../config/config.js';
import type { ArchitectureAnalysisResult } from '../../core/results/analysis-result.js';
import { hasFailures } from './verdict.js';

export function formatJsonReport(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
): string {
  return `${JSON.stringify(
    {
      // Stated outright rather than left to be re-derived. A forbidden cycle
      // fails the run with no violations at all, so a reader counting the
      // violations array would call that run clean; and `cycles.forbidden`,
      // which is what settles it, lives in the configuration, not here.
      passed: !hasFailures(result, config),
      files: result.filesAnalyzed,
      // `files` alone cannot tell a consumer whether the rules had anything to
      // act on: a file no layer claims is a file no rule can reach.
      filesClassified: result.filesClassified,
      dependencies: result.dependenciesAnalyzed,
      violations: result.violations.map((violation) => ({
        source: violation.sourceFile,
        target: violation.targetFile,
        sourceLayer: violation.sourceLayer,
        targetLayer: violation.targetLayer,
        rule: violation.rule,
        importSpecifier: violation.importSpecifier,
        ...(violation.line !== undefined ? { line: violation.line } : {}),
        ...(violation.column !== undefined ? { column: violation.column } : {}),
      })),
      cycles: result.cycles.map((cycle) => ({
        files: cycle.files,
      })),
      cyclesForbidden: config.cycles?.forbidden === true,
    },
    null,
    2,
  )}\n`;
}
