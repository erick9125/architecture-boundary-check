export interface ArchitectureRule {
  readonly from: string;
  readonly cannotDependOn?: readonly string[];
  readonly canOnlyDependOn?: readonly string[];
}
