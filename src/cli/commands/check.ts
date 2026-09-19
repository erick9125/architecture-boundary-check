import path from 'node:path';
import { analyzeArchitecture } from '../../analyze-architecture.js';
import type { ArchitectureConfig } from '../../config/config.js';
import { loadConfigFromDirectory } from '../../config/loader.js';
import { ConfigurationError } from '../../config/errors.js';
import { ArchitectureEngineError } from '../../core/errors.js';
import { EXIT_ERROR, EXIT_SUCCESS, EXIT_VIOLATIONS } from '../exit-codes.js';
import { formatConsoleReport } from '../output/console-reporter.js';
import { hasFailures } from '../output/verdict.js';
import { preflightFailure } from '../output/preflight.js';
import { formatJsonReport } from '../output/json-reporter.js';

export type OutputFormat = 'console' | 'json';

export interface CheckCommandOptions {
  readonly cwd: string;
  /**
   * The project to analyze, when it is not the working directory.
   *
   * Kept apart from `cwd` rather than replacing it: `cwd` is what a relative
   * `--config` resolves against, and folding the two together would make
   * `--root ../other --config ../other/rules.yml` look for the config inside
   * `../other/../other`.
   */
  readonly rootDirectory?: string;
  readonly configPath?: string;
  readonly format: OutputFormat;
  readonly stdout: { write(value: string): void };
  readonly stderr: { write(value: string): void };
}

export async function runCheck(options: CheckCommandOptions): Promise<number> {
  try {
    const loaded = loadConfigFromDirectory(
      options.cwd,
      options.configPath,
    );
    const rootDirectory = path.resolve(
      options.cwd,
      options.rootDirectory ?? '.',
    );
    const result = await analyzeArchitecture({
      rootDirectory,
      config: loaded.config,
    });

    // Before the report, not after: a run that looked at nothing has no verdict
    // to render, and printing one would be the failure this guard exists for.
    const preflight = preflightFailure(result, loaded.config, {
      rootDirectory,
    });

    if (preflight !== undefined) {
      options.stderr.write(`${preflight}\n`);
      return EXIT_ERROR;
    }

    options.stdout.write(render(result, loaded.config, options.format));

    return hasFailures(result, loaded.config) ? EXIT_VIOLATIONS : EXIT_SUCCESS;
  } catch (error) {
    options.stderr.write(`${formatError(error)}\n`);
    return EXIT_ERROR;
  }
}

function render(
  result: Awaited<ReturnType<typeof analyzeArchitecture>>,
  config: ArchitectureConfig,
  format: OutputFormat,
): string {
  if (format === 'json') {
    return formatJsonReport(result, config);
  }

  return formatConsoleReport(result, config);
}

function formatError(error: unknown): string {
  if (error instanceof ConfigurationError || error instanceof ArchitectureEngineError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
