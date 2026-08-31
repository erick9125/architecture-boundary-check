export interface ArchitectureViolation {
  readonly sourceFile: string;
  readonly targetFile: string;
  readonly sourceLayer: string;
  readonly targetLayer: string;
  readonly rule: string;
  readonly importSpecifier: string;
  readonly line?: number;
  readonly column?: number;
}
