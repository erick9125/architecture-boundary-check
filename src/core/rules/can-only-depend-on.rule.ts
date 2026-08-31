import type { ArchitectureRule } from './architecture-rule.js';

export function describeCanOnlyDependOn(
  rule: ArchitectureRule,
  targetLayer: string,
): string {
  const allowed = rule.canOnlyDependOn?.join(', ') ?? '';
  return `${rule.from} can only depend on ${allowed} (not ${targetLayer})`;
}

export function matchesCanOnlyDependOn(
  rule: ArchitectureRule,
  targetLayer: string,
): boolean {
  return (
    rule.canOnlyDependOn !== undefined &&
    !rule.canOnlyDependOn.includes(targetLayer)
  );
}
