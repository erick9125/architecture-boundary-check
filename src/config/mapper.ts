import type { ArchitectureModel } from '../core/architecture/architecture-model.js';
import type { ArchitectureConfig } from './config.js';

export function configToModel(config: ArchitectureConfig): ArchitectureModel {
  return {
    root: config.root ?? '.',
    layers: config.layers.map((layer) => ({
      name: layer.name,
      patterns: layer.paths,
    })),
    rules: config.rules,
    cycles: {
      forbidden: config.cycles?.forbidden === true,
    },
    exceptions: config.exceptions ?? [],
    ignore: config.ignore ?? [],
  };
}
