import type { ArchitectureRule } from './architecture-rule.js';

export function describeCannotDependOn(
  rule: ArchitectureRule,
  targetLayer: string,
): string {
  return `${rule.from} cannot depend on ${targetLayer}`;
}

export function matchesCannotDependOn(
  rule: ArchitectureRule,
  targetLayer: string,
): boolean {
  return rule.cannotDependOn?.includes(targetLayer) === true;
}
