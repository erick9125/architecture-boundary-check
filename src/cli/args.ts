import type { OutputFormat } from './commands/check.js';

export interface ParsedArgs {
  readonly command: 'check' | 'help' | 'version';
  readonly configPath?: string;
  readonly rootDirectory?: string;
  readonly format: OutputFormat;
}

export const HELP = `architecture-boundary-check - Enforce architectural dependency boundaries

Usage:
  architecture-boundary-check [check] [options]

Options:
  --config <path>   Path to architecture-boundary.yml
  --root <path>     Project directory to analyze (default: current directory)
  --format <type>   console (default) | json
  --help            Show help
  --version         Show version

Exit codes:
  0  Success
  1  Architecture violations (or forbidden cycles)
  2  Configuration or execution error, including a run that analyzed nothing
`;

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args = argv.slice(2);
  let configPath: string | undefined;
  let rootDirectory: string | undefined;
  let format: OutputFormat = 'console';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === 'check') {
      continue;
    }

    // Asking for help wins immediately. Reading on would let a later
    // half-written flag fail the very command that explains the flags.
    if (arg === 'help' || arg === '--help' || arg === '-h') {
      return { command: 'help', format };
    }

    if (arg === 'version' || arg === '--version' || arg === '-v') {
      return { command: 'version', format };
    }

    if (arg === '--config') {
      configPath = takeValue(args, index, '--config');
      index += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      configPath = requireNonEmpty(arg.slice('--config='.length), '--config');
      continue;
    }

    if (arg === '--root') {
      rootDirectory = takeValue(args, index, '--root');
      index += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      rootDirectory = requireNonEmpty(arg.slice('--root='.length), '--root');
      continue;
    }

    if (arg === '--format') {
      format = parseFormat(takeValue(args, index, '--format'));
      index += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      format = parseFormat(arg.slice('--format='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    command: 'check',
    format,
    ...(configPath !== undefined ? { configPath } : {}),
    ...(rootDirectory !== undefined ? { rootDirectory } : {}),
  };
}

/**
 * Reads the value that follows a flag. A value that looks like another flag is
 * rejected instead of consumed, so `--config --format json` reports the missing
 * path rather than swallowing `--format` and blaming `json`.
 */
function takeValue(
  args: readonly string[],
  index: number,
  flag: string,
): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`${flag} requires a value.`);
  }

  return requireNonEmpty(value, flag);
}

function requireNonEmpty(value: string, flag: string): string {
  if (value.trim() === '') {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function parseFormat(value: string): OutputFormat {
  if (value === 'console' || value === 'json') {
    return value;
  }

  throw new Error('--format must be console or json.');
}
