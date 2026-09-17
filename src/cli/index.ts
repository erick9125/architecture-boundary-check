#!/usr/bin/env node

import { HELP, parseArgs } from './args.js';
import { runCheck } from './commands/check.js';
import { EXIT_ERROR, EXIT_SUCCESS } from './exit-codes.js';
import { VERSION } from '../version.js';

async function main(argv: readonly string[]): Promise<number> {
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

const exitCode = await main(process.argv);
process.exitCode = exitCode;
