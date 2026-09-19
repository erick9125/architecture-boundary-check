import type { ArchitectureViolation } from './violation.js';
import type { DependencyCycle } from '../graph/dependency-cycle.js';

export interface ArchitectureAnalysisResult {
  readonly filesAnalyzed: number;
  /**
   * How many of the analyzed files landed in a layer.
   *
   * Reported alongside `filesAnalyzed` because the two disagreeing is the
   * difference between a check that ran and one that only looked like it did:
   * rules are keyed on layer names, so a file no layer claims is a file no rule
   * can reach.
   */
  readonly filesClassified: number;
  readonly dependenciesAnalyzed: number;
  readonly violations: readonly ArchitectureViolation[];
  readonly cycles: readonly DependencyCycle[];
}
