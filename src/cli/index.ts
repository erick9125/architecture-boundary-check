#!/usr/bin/env node

import { runCheck, type OutputFormat } from './commands/check.js';
import { EXIT_ERROR, EXIT_SUCCESS } from './exit-codes.js';
import { VERSION } from '../version.js';

interface ParsedArgs {
  readonly command: 'check' | 'help' | 'version';
  readonly configPath?: string;
  readonly format: OutputFormat;
}

const HELP = `architecture-boundary-check - Enforce architectural dependency boundaries

Usage:
  architecture-boundary-check [check] [options]

Options:
  --config <path>   Path to architecture-boundary.yml
  --format <type>   console (default) | json
  --help            Show help
  --version         Show version

Exit codes:
  0  Success
  1  Architecture violations
  2  Configuration or execution error
`;

async function main(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);

    if (args.command === 'help') {
      process.stdout.write(HELP);
      return EXIT_SUCCESS;
    }

    if (args.command === 'version') {
      process.stdout.write(`${VERSION}\n`);
      return EXIT_SUCCESS;
    }

    return await runCheck({
      cwd: process.cwd(),
      format: args.format,
      stdout: process.stdout,
      stderr: process.stderr,
      ...(args.configPath !== undefined ? { configPath: args.configPath } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return EXIT_ERROR;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let command: ParsedArgs['command'] = 'check';
  let configPath: string | undefined;
  let format: OutputFormat = 'console';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }

    if (arg === 'check') {
      command = 'check';
      continue;
    }

    if (arg === 'help' || arg === '--help' || arg === '-h') {
      command = 'help';
      continue;
    }

    if (arg === 'version' || arg === '--version' || arg === '-v') {
      command = 'version';
      continue;
    }

    if (arg === '--config') {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error('--config requires a path.');
      }
      configPath = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      configPath = arg.slice('--config='.length);
      continue;
    }

    if (arg === '--format') {
      const value = args[index + 1];
      format = parseFormat(value);
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
    command,
    format,
    ...(configPath !== undefined ? { configPath } : {}),
  };
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === 'console' || value === 'json') {
    return value;
  }

  throw new Error('--format must be console or json.');
}

const exitCode = await main(process.argv);
process.exitCode = exitCode;
