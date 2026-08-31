import { analyzeArchitecture } from '../../analyze-architecture.js';
import type { ArchitectureConfig } from '../../config/config.js';
import { loadConfigFromDirectory } from '../../config/loader.js';
import { ConfigurationError } from '../../config/errors.js';
import { ArchitectureEngineError } from '../../core/errors.js';
import { EXIT_ERROR, EXIT_SUCCESS, EXIT_VIOLATIONS } from '../exit-codes.js';
import { formatConsoleReport, hasFailures } from '../output/console-reporter.js';
import { formatJsonReport } from '../output/json-reporter.js';

export type OutputFormat = 'console' | 'json';

export interface CheckCommandOptions {
  readonly cwd: string;
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
    const result = await analyzeArchitecture({
      rootDirectory: options.cwd,
      config: loaded.config,
    });

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
    return formatJsonReport(result);
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
