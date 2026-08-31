import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCheck } from '../../src/cli/commands/check.js';
import {
  EXIT_ERROR,
  EXIT_SUCCESS,
  EXIT_VIOLATIONS,
} from '../../src/cli/exit-codes.js';
import { fixtureDir } from '../helpers/fixtures.js';

function createStreams() {
  let stdout = '';
  let stderr = '';

  return {
    stdout: {
      write(value: string) {
        stdout += value;
      },
    },
    stderr: {
      write(value: string) {
        stderr += value;
      },
    },
    read() {
      return { stdout, stderr };
    },
  };
}

describe('CLI check', () => {
  it('exits 0 for a valid project', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('valid-clean'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_SUCCESS);
    expect(streams.read().stdout).toContain('Architecture check passed.');
  });

  it('exits 1 when architecture violations exist', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('invalid-domain-infra'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_VIOLATIONS);
    expect(streams.read().stdout).toContain('Architecture check failed.');
    expect(streams.read().stdout).toContain('domain cannot depend on infrastructure');
  });

  it('prints a JSON report', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('invalid-domain-infra'),
      format: 'json',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_VIOLATIONS);
    const report = JSON.parse(streams.read().stdout) as {
      files: number;
      violations: unknown[];
    };
    expect(report.files).toBeGreaterThan(0);
    expect(report.violations).toHaveLength(2);
  });

  it('exits 2 for invalid configuration', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('valid-clean'),
      configPath: path.join(fixtureDir('valid-clean'), 'missing.yml'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_ERROR);
    expect(streams.read().stderr).toContain('Configuration file not found');
  });

  it('exits 1 for forbidden circular dependencies', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('circular'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_VIOLATIONS);
    expect(streams.read().stdout).toContain('Circular dependency detected');
  });
});
