import type { ArchitectureException, IgnorePattern } from '../core/architecture/exceptions.js';
import type { ArchitectureRule } from '../core/rules/architecture-rule.js';

export interface ArchitectureConfig {
  readonly version: 1;
  readonly root?: string;
  readonly layers: readonly LayerConfig[];
  readonly rules: readonly ArchitectureRule[];
  readonly cycles?: {
    readonly forbidden?: boolean;
  };
  readonly exclude?: readonly string[];
  readonly ignore?: readonly IgnorePattern[];
  readonly exceptions?: readonly ArchitectureException[];
}

export interface LayerConfig {
  readonly name: string;
  readonly paths: readonly string[];
}
