import { ConfigurationError } from './errors.js';
import type { ArchitectureConfig, LayerConfig } from './config.js';
import type { ArchitectureException, IgnorePattern } from '../core/architecture/exceptions.js';
import type { ArchitectureRule } from '../core/rules/architecture-rule.js';

export interface ValidateConfigOptions {
  readonly now?: Date;
}

const ROOT_KEYS = [
  'version',
  'root',
  'layers',
  'rules',
  'cycles',
  'exclude',
  'ignore',
  'exceptions',
] as const;

const LAYER_KEYS = ['name', 'paths'] as const;
const RULE_KEYS = ['from', 'cannotDependOn', 'canOnlyDependOn'] as const;
const EXCEPTION_KEYS = ['from', 'to', 'files', 'source', 'reason', 'expires'] as const;
const IGNORE_KEYS = ['source'] as const;
const CYCLES_KEYS = ['forbidden'] as const;

export function validateConfig(
  value: unknown,
  options: ValidateConfigOptions = {},
): ArchitectureConfig {
  if (!isRecord(value)) {
    throw new ConfigurationError('Configuration must be a YAML or JSON object.');
  }

  assertKnownKeys(value, ROOT_KEYS, '');

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

    assertKnownKeys(item, LAYER_KEYS, `layers[${index}]`);

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

    assertKnownKeys(item, RULE_KEYS, `rules[${index}]`);

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

    assertKnownKeys(item, EXCEPTION_KEYS, `exceptions[${index}]`);

    const from = parseRequiredString(item.from, `exceptions[${index}].from`);
    const to = parseRequiredString(item.to, `exceptions[${index}].to`);
    assertKnownLayer(from, layerNames, `exceptions[${index}].from`);
    assertKnownLayer(to, layerNames, `exceptions[${index}].to`);

    const source = parseStringArray(item.source, `exceptions[${index}].source`);
    const files = parseStringArray(item.files, `exceptions[${index}].files`);
    const reason = parseOptionalString(item.reason, `exceptions[${index}].reason`);
    const expires = parseOptionalString(item.expires, `exceptions[${index}].expires`);

    if (expires !== undefined) {
      assertCalendarDate(expires, `exceptions[${index}].expires`);

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

    assertKnownKeys(item, IGNORE_KEYS, `ignore[${index}]`);

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

  assertKnownKeys(value, CYCLES_KEYS, 'cycles');

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

/**
 * Rejects keys the validator does not read.
 *
 * Ignoring them silently is how a typo passes a build: `excludes` instead of
 * `exclude` drops the exclusions and the run still reports success, and a
 * misspelled `files` on an exception drops its file filter, widening a
 * one-file exception into an amnesty for the whole layer pair. Both fail by
 * being more permissive, which is the direction nobody notices.
 */
function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const known = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !known.has(key));

  if (unknown.length === 0) {
    return;
  }

  const where = label === '' ? 'Configuration' : label;
  const noun = unknown.length === 1 ? 'key' : 'keys';

  throw new ConfigurationError(
    `${where} has unknown ${noun}: ${unknown.sort().join(', ')}. Expected one of: ${[...allowed].sort().join(', ')}.`,
  );
}

/**
 * A date that matches the shape but not the calendar is worse than one that
 * matches neither: `2026-13-45` never sorts before the current date, so the
 * exception it guards never expires and the deadline its author wrote down
 * quietly becomes permanent.
 */
function assertCalendarDate(value: string, label: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new ConfigurationError(`${label} must use YYYY-MM-DD.`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    throw new ConfigurationError(`${label} is not a real date: ${value}.`);
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
