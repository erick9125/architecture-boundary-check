import type { ArchitectureAnalysisResult } from '../../core/results/analysis-result.js';

export function formatJsonReport(result: ArchitectureAnalysisResult): string {
  return `${JSON.stringify(
    {
      files: result.filesAnalyzed,
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
    },
    null,
    2,
  )}\n`;
}
