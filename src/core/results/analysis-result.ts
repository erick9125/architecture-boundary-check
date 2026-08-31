import type { ArchitectureViolation } from './violation.js';
import type { DependencyCycle } from '../graph/dependency-cycle.js';

export interface ArchitectureAnalysisResult {
  readonly filesAnalyzed: number;
  readonly dependenciesAnalyzed: number;
  readonly violations: readonly ArchitectureViolation[];
  readonly cycles: readonly DependencyCycle[];
}
