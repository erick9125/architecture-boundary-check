import picomatch from 'picomatch';
import type { Layer } from './layer.js';
import { MultipleLayerMatchError } from '../errors.js';
import { normalizeRelativePath } from '../paths.js';

const UNCLASSIFIED = undefined;

export class LayerResolver {
  private readonly matchers: readonly {
    readonly name: string;
    readonly match: (file: string) => boolean;
  }[];
  private readonly rootPrefix: string;

  constructor(layers: readonly Layer[], root = '.') {
    this.rootPrefix = normalizeRoot(root);
    this.matchers = layers.map((layer) => ({
      name: layer.name,
      match: picomatch([...layer.patterns], {
        dot: true,
        nocase: false,
      }),
    }));
  }

  resolve(filePath: string): string | undefined {
    const matches = this.matchingLayers(filePath);
    if (matches.length > 1) {
      throw new MultipleLayerMatchError(filePath, matches);
    }

    return matches[0] ?? UNCLASSIFIED;
  }

  classify(files: readonly string[]): ReadonlyMap<string, string | undefined> {
    const result = new Map<string, string | undefined>();

    for (const file of files) {
      result.set(file, this.resolve(file));
    }

    return result;
  }

  private matchingLayers(filePath: string): string[] {
    const relative = this.toMatchPath(filePath);
    const matches: string[] = [];

    for (const matcher of this.matchers) {
      if (matcher.match(relative) || matcher.match(normalizeRelativePath(filePath))) {
        matches.push(matcher.name);
      }
    }

    return unique(matches);
  }

  private toMatchPath(filePath: string): string {
    const normalized = normalizeRelativePath(filePath);
    if (this.rootPrefix === '') {
      return normalized;
    }

    const prefix = `${this.rootPrefix}/`;
    if (normalized === this.rootPrefix) {
      return '';
    }

    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length);
    }

    return normalized;
  }
}

function normalizeRoot(root: string): string {
  const normalized = normalizeRelativePath(root);
  if (normalized === '.' || normalized === '') {
    return '';
  }

  return normalized;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
