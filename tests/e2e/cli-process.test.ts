import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  EXIT_ERROR,
  EXIT_SUCCESS,
  EXIT_VIOLATIONS,
} from '../../src/cli/exit-codes.js';
import { fixtureDir } from '../helpers/fixtures.js';

const run = promisify(execFile);

const cli = fileURLToPath(new URL('../../src/cli/index.ts', import.meta.url));

interface Run {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Runs the entry point as its own process. The other CLI suite calls runCheck()
 * directly, which leaves argument parsing and the exit-code wiring uncovered.
 */
async function runCli(args: readonly string[], cwd?: string): Promise<Run> {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      ['--import', 'tsx', cli, ...args],
      { cwd: cwd ?? path.dirname(cli) },
    );
    return { code: EXIT_SUCCESS, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failure.code ?? -1,
      stdout: failure.stdout ?? '',
      stderr: failure.stderr ?? '',
    };
  }
}

/**
 * Every case spawns `node --import tsx`, which costs a second or two on its own
 * before the CLI runs. Under the full suite that start-up contends with the
 * other test files and overruns the 5s default, so these fail on load rather
 * than on behaviour. The generous budget is not a slow test being excused: it
 * is process start-up being kept out of the assertion.
 */
describe('CLI process', { timeout: 30_000 }, () => {
  it('prints the version and exits 0', async () => {
    const result = await runCli(['--version']);

    expect(result.code).toBe(EXIT_SUCCESS);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints help and exits 0', async () => {
    const result = await runCli(['--help']);

    expect(result.code).toBe(EXIT_SUCCESS);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('--config <path>');
  });

  it('still prints help when a later flag is missing its value', async () => {
    const result = await runCli(['--help', '--config']);

    expect(result.code).toBe(EXIT_SUCCESS);
    expect(result.stdout).toContain('Usage:');
  });

  it('names the flag that is missing a value instead of the next one', async () => {
    const result = await runCli(['--config', '--format', 'json']);

    expect(result.code).toBe(EXIT_ERROR);
    expect(result.stderr).toContain('--config requires a value.');
    expect(result.stderr).not.toContain('json');
  });

  it('exits 2 on an unknown argument', async () => {
    const result = await runCli(['--nope']);

    expect(result.code).toBe(EXIT_ERROR);
    expect(result.stderr).toContain('Unknown argument: --nope');
  });

  it('exits 0 on a clean project', async () => {
    const result = await runCli([], fixtureDir('valid-clean'));

    expect(result.code).toBe(EXIT_SUCCESS);
    expect(result.stdout).toContain('Architecture check passed.');
  });

  it('exits 1 when the project has violations', async () => {
    const result = await runCli([], fixtureDir('invalid-domain-infra'));

    expect(result.code).toBe(EXIT_VIOLATIONS);
    expect(result.stdout).toContain('Architecture check failed.');
  });
});
