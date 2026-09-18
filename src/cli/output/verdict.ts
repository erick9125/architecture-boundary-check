import type { ArchitectureConfig } from '../../config/config.js';
import type { ArchitectureAnalysisResult } from '../../core/results/analysis-result.js';

/**
 * The single rule for whether a run failed.
 *
 * Both reporters and the exit code read it from here. A cycle only fails the
 * run when the configuration forbids cycles, which is why the result alone is
 * not enough to answer the question.
 */
export function hasFailures(
  result: ArchitectureAnalysisResult,
  config: ArchitectureConfig,
): boolean {
  if (result.violations.length > 0) {
    return true;
  }

  return config.cycles?.forbidden === true && result.cycles.length > 0;
}
