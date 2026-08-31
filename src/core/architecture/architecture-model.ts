import type { Layer } from './layer.js';
import type { ArchitectureRule } from '../rules/architecture-rule.js';
import type {
  ArchitectureException,
  IgnorePattern,
} from './exceptions.js';

export interface ArchitectureModel {
  readonly root: string;
  readonly layers: readonly Layer[];
  readonly rules: readonly ArchitectureRule[];
  readonly cycles: {
    readonly forbidden: boolean;
  };
  readonly exceptions: readonly ArchitectureException[];
  readonly ignore: readonly IgnorePattern[];
}
