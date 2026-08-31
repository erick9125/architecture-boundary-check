export type DependencyKind = 'static-import' | 'dynamic-import' | 'require';

export interface Dependency {
  readonly source: string;
  readonly target: string;
  readonly specifier: string;
  readonly kind: DependencyKind;
  readonly line?: number;
  readonly column?: number;
}
