export interface ArchitectureException {
  readonly from: string;
  readonly to: string;
  readonly source?: readonly string[];
  readonly files?: readonly string[];
  readonly reason?: string;
  readonly expires?: string;
}

export interface IgnorePattern {
  readonly source: string;
}
