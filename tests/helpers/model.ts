import type { ArchitectureModel } from '../../src/core/architecture/architecture-model.js';
import type { Layer } from '../../src/core/architecture/layer.js';
import type { ArchitectureRule } from '../../src/core/rules/architecture-rule.js';

export function createModel(
  overrides: Partial<ArchitectureModel> = {},
): ArchitectureModel {
  return {
    root: 'src',
    layers: defaultLayers(),
    rules: defaultRules(),
    cycles: { forbidden: false },
    exceptions: [],
    ignore: [],
    ...overrides,
  };
}

export function defaultLayers(): Layer[] {
  return [
    { name: 'domain', patterns: ['domain/**'] },
    { name: 'application', patterns: ['application/**'] },
    { name: 'infrastructure', patterns: ['infrastructure/**'] },
  ];
}

export function defaultRules(): ArchitectureRule[] {
  return [
    {
      from: 'domain',
      cannotDependOn: ['application', 'infrastructure'],
    },
    {
      from: 'application',
      cannotDependOn: ['infrastructure'],
    },
  ];
}
