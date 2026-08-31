import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ArchitectureConfig } from './config.js';
import { ConfigurationError } from './errors.js';
import { CONFIG_FILE_CANDIDATES } from './schema.js';
import { validateConfig, type ValidateConfigOptions } from './validator.js';

export function findConfigFile(cwd: string): string | undefined {
  for (const candidate of CONFIG_FILE_CANDIDATES) {
    const fullPath = path.join(cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
}

export function loadConfigFile(
  configPath: string,
  options: ValidateConfigOptions = {},
): ArchitectureConfig {
  let contents: string;
  try {
    contents = fs.readFileSync(configPath, 'utf8');
  } catch {
    throw new ConfigurationError(`Configuration file not found: ${configPath}`);
  }

  const raw = parseConfigContents(contents, configPath);
  return validateConfig(raw, options);
}

export function loadConfigFromDirectory(
  cwd: string,
  configPath: string | undefined,
  options: ValidateConfigOptions = {},
): { config: ArchitectureConfig; configPath: string } {
  const resolved = configPath
    ? path.resolve(cwd, configPath)
    : findConfigFile(cwd);

  if (!resolved) {
    throw new ConfigurationError(
      `No configuration file found. Looked for ${CONFIG_FILE_CANDIDATES.join(', ')}.`,
    );
  }

  return {
    config: loadConfigFile(resolved, options),
    configPath: resolved,
  };
}

function parseConfigContents(contents: string, configPath: string): unknown {
  const extension = path.extname(configPath).toLowerCase();

  try {
    if (extension === '.json') {
      return JSON.parse(contents) as unknown;
    }

    return parseYaml(contents) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigurationError(
      `Failed to parse configuration file ${configPath}: ${message}`,
    );
  }
}
