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

// A run that analyzed nothing reports zero violations for the same reason a
// clean project does. Grading it as a pass is how a typo in one line turns a CI
// gate into a no-op nobody notices.
describe('CLI check refuses to grade a run that looked at nothing', () => {
  it('exits 2 when `root` points at a directory that does not exist', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('empty-scan-root'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    const { stdout, stderr } = streams.read();
    expect(code).toBe(EXIT_ERROR);
    expect(stderr).toContain('No source files were analyzed.');
    expect(stderr).toContain('"sorce"');
    expect(stdout).toBe('');
  });

  it('exits 2 when `exclude` covers the whole source tree', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('excluded-everything'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    const { stdout, stderr } = streams.read();
    expect(code).toBe(EXIT_ERROR);
    expect(stderr).toContain('No source files were analyzed.');
    expect(stderr).toContain('Exclusions: src/**');
    expect(stdout).toBe('');
  });

  it('exits 2 when files were analyzed but no layer claimed any of them', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('unclassified-layers'),
      format: 'console',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    const { stdout, stderr } = streams.read();
    expect(code).toBe(EXIT_ERROR);
    expect(stderr).toContain('none of them matched a layer');
    expect(stderr).toContain('app/domain/**');
    expect(stdout).toBe('');
  });

  // The JSON consumer must not get a `passed: true` document either.
  it('reports the failure on stderr rather than as a JSON verdict', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('empty-scan-root'),
      format: 'json',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    expect(code).toBe(EXIT_ERROR);
    expect(streams.read().stdout).toBe('');
  });
});

// Without --root the analysis is always rooted at the working directory, so
// pointing --config at another project analyzed the caller's directory instead
// and reported a clean result for a project it never opened.
describe('CLI check --root', () => {
  it('analyzes the directory given by rootDirectory, not the working directory', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('valid-clean'),
      rootDirectory: path.join('..', 'invalid-domain-infra'),
      configPath: path.join(
        fixtureDir('invalid-domain-infra'),
        'architecture-boundary.yml',
      ),
      format: 'json',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    const report = JSON.parse(streams.read().stdout) as {
      passed: boolean;
      violations: readonly { source: string }[];
    };

    expect(code).toBe(EXIT_VIOLATIONS);
    expect(report.passed).toBe(false);
    // The violations belong to the project --root named. `valid-clean`, the
    // working directory, has none at all.
    expect(report.violations.length).toBeGreaterThan(0);
    expect(
      report.violations.some((violation) =>
        violation.source.startsWith('src/'),
      ),
    ).toBe(true);
  });

  it('still defaults to the working directory', async () => {
    const streams = createStreams();
    const code = await runCheck({
      cwd: fixtureDir('valid-clean'),
      format: 'json',
      stdout: streams.stdout,
      stderr: streams.stderr,
    });

    const report = JSON.parse(streams.read().stdout) as {
      passed: boolean;
      files: number;
      filesClassified: number;
    };

    expect(code).toBe(EXIT_SUCCESS);
    expect(report.passed).toBe(true);
    expect(report.files).toBeGreaterThan(0);
    expect(report.filesClassified).toBe(report.files);
  });
});
