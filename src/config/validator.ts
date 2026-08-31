import { ConfigurationError } from './errors.js';
import type { ArchitectureConfig, LayerConfig } from './config.js';
import type { ArchitectureException, IgnorePattern } from '../core/architecture/exceptions.js';
import type { ArchitectureRule } from '../core/rules/architecture-rule.js';

export interface ValidateConfigOptions {
  readonly now?: Date;
}

export function validateConfig(
  value: unknown,
  options: ValidateConfigOptions = {},
): ArchitectureConfig {
  if (!isRecord(value)) {
    throw new ConfigurationError('Configuration must be a YAML or JSON object.');
  }

  if (value.version !== 1) {
    throw new ConfigurationError('Configuration version must be 1.');
  }

  const layers = parseLayers(value.layers);
  const layerNames = new Set(layers.map((layer) => layer.name));
  const rules = parseRules(value.rules, layerNames);
  const exceptions = parseExceptions(
    value.exceptions,
    layerNames,
    options.now ?? new Date(),
  );
  const ignore = parseIgnore(value.ignore);
  const exclude = parseStringArray(value.exclude, 'exclude');
  const cycles = parseCycles(value.cycles);
  const root = parseOptionalString(value.root, 'root');

  return {
    version: 1,
    layers,
    rules,
    ...(root !== undefined ? { root } : {}),
    ...(cycles !== undefined ? { cycles } : {}),
    ...(exclude !== undefined ? { exclude } : {}),
    ...(ignore !== undefined ? { ignore } : {}),
    ...(exceptions !== undefined ? { exceptions } : {}),
  };
}

function parseLayers(value: unknown): LayerConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ConfigurationError('Configuration must declare at least one layer.');
  }

  const layers: LayerConfig[] = [];
  const names = new Set<string>();

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      throw new ConfigurationError(`layers[${index}] must be an object.`);
    }

    const name = parseRequiredString(item.name, `layers[${index}].name`);
    if (names.has(name)) {
      throw new ConfigurationError(`Duplicate layer name: ${name}.`);
    }
    names.add(name);

    const paths = parseStringArray(item.paths, `layers[${index}].paths`);
    if (!paths || paths.length === 0) {
      throw new ConfigurationError(`layers[${index}].paths must not be empty.`);
    }

    for (const [pathIndex, glob] of paths.entries()) {
      if (glob.trim() === '') {
        throw new ConfigurationError(
          `layers[${index}].paths[${pathIndex}] must not be empty.`,
        );
      }
    }

    layers.push({ name, paths });
  }

  return layers;
}

function parseRules(
  value: unknown,
  layerNames: ReadonlySet<string>,
): ArchitectureRule[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ConfigurationError('rules must be an array.');
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ConfigurationError(`rules[${index}] must be an object.`);
    }

    const from = parseRequiredString(item.from, `rules[${index}].from`);
    assertKnownLayer(from, layerNames, `rules[${index}].from`);

    const cannotDependOn = parseStringArray(
      item.cannotDependOn,
      `rules[${index}].cannotDependOn`,
    );
    const canOnlyDependOn = parseStringArray(
      item.canOnlyDependOn,
      `rules[${index}].canOnlyDependOn`,
    );

    if (cannotDependOn !== undefined && canOnlyDependOn !== undefined) {
      throw new ConfigurationError(
        `rules[${index}] cannot use cannotDependOn and canOnlyDependOn at the same time.`,
      );
    }

    if (cannotDependOn === undefined && canOnlyDependOn === undefined) {
      throw new ConfigurationError(
        `rules[${index}] must define cannotDependOn or canOnlyDependOn.`,
      );
    }

    const targets = cannotDependOn ?? canOnlyDependOn ?? [];
    if (targets.length === 0) {
      throw new ConfigurationError(
        `rules[${index}] dependency list must not be empty.`,
      );
    }

    const uniqueTargets = new Set<string>();
    for (const [targetIndex, target] of targets.entries()) {
      if (uniqueTargets.has(target)) {
        throw new ConfigurationError(
          `rules[${index}] repeats layer ${target}.`,
        );
      }
      uniqueTargets.add(target);
      assertKnownLayer(
        target,
        layerNames,
        `rules[${index}].${cannotDependOn ? 'cannotDependOn' : 'canOnlyDependOn'}[${targetIndex}]`,
      );
    }

    return {
      from,
      ...(cannotDependOn !== undefined ? { cannotDependOn } : {}),
      ...(canOnlyDependOn !== undefined ? { canOnlyDependOn } : {}),
    };
  });
}

function parseExceptions(
  value: unknown,
  layerNames: ReadonlySet<string>,
  now: Date,
): ArchitectureException[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ConfigurationError('exceptions must be an array.');
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ConfigurationError(`exceptions[${index}] must be an object.`);
    }

    const from = parseRequiredString(item.from, `exceptions[${index}].from`);
    const to = parseRequiredString(item.to, `exceptions[${index}].to`);
    assertKnownLayer(from, layerNames, `exceptions[${index}].from`);
    assertKnownLayer(to, layerNames, `exceptions[${index}].to`);

    const source = parseStringArray(item.source, `exceptions[${index}].source`);
    const files = parseStringArray(item.files, `exceptions[${index}].files`);
    const reason = parseOptionalString(item.reason, `exceptions[${index}].reason`);
    const expires = parseOptionalString(item.expires, `exceptions[${index}].expires`);

    if (expires !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
        throw new ConfigurationError(
          `exceptions[${index}].expires must use YYYY-MM-DD.`,
        );
      }

      if (isExpired(expires, now)) {
        throw new ConfigurationError(
          `Architecture exception expired: ${from} → ${to} (expires ${expires}).`,
        );
      }
    }

    return {
      from,
      to,
      ...(source !== undefined ? { source } : {}),
      ...(files !== undefined ? { files } : {}),
      ...(reason !== undefined ? { reason } : {}),
      ...(expires !== undefined ? { expires } : {}),
    };
  });
}

function parseIgnore(value: unknown): IgnorePattern[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ConfigurationError('ignore must be an array.');
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ConfigurationError(`ignore[${index}] must be an object.`);
    }

    return {
      source: parseRequiredString(item.source, `ignore[${index}].source`),
    };
  });
}

function parseCycles(value: unknown): { forbidden: boolean } | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new ConfigurationError('cycles must be an object.');
  }

  if (value.forbidden !== undefined && typeof value.forbidden !== 'boolean') {
    throw new ConfigurationError('cycles.forbidden must be a boolean.');
  }

  return {
    forbidden: value.forbidden === true,
  };
}

function parseStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ConfigurationError(`${label} must be an array of strings.`);
  }

  return value.map((item, index) => parseRequiredString(item, `${label}[${index}]`));
}

function parseRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigurationError(`${label} must be a non-empty string.`);
  }

  return value;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseRequiredString(value, label);
}

function assertKnownLayer(
  name: string,
  layerNames: ReadonlySet<string>,
  label: string,
): void {
  if (!layerNames.has(name)) {
    throw new ConfigurationError(`${label} references unknown layer: ${name}.`);
  }
}

function isExpired(expires: string, now: Date): boolean {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return expires < today;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
