import { describe, expect, it } from 'vitest';
import { parseArgs, type ParsedArgs } from '../../src/cli/args.js';

function parse(...args: string[]): ParsedArgs {
  return parseArgs(['node', 'cli', ...args]);
}

describe('parseArgs', () => {
  const accepted: ReadonlyArray<{
    readonly name: string;
    readonly argv: readonly string[];
    readonly expected: ParsedArgs;
  }> = [
    {
      name: 'defaults to check with the console format',
      argv: [],
      expected: { command: 'check', format: 'console' },
    },
    {
      name: 'accepts an explicit check subcommand',
      argv: ['check'],
      expected: { command: 'check', format: 'console' },
    },
    {
      name: 'reads --config as a separate argument',
      argv: ['--config', 'arch.yml'],
      expected: { command: 'check', format: 'console', configPath: 'arch.yml' },
    },
    {
      name: 'reads --config in its inline form',
      argv: ['--config=arch.yml'],
      expected: { command: 'check', format: 'console', configPath: 'arch.yml' },
    },
    {
      name: 'reads --root as a separate argument',
      argv: ['--root', '../other'],
      expected: { command: 'check', format: 'console', rootDirectory: '../other' },
    },
    {
      name: 'reads --root in its inline form',
      argv: ['--root=../other'],
      expected: { command: 'check', format: 'console', rootDirectory: '../other' },
    },
    {
      name: 'reads --root alongside --config',
      argv: ['--root', '../other', '--config', '../other/arch.yml'],
      expected: {
        command: 'check',
        format: 'console',
        configPath: '../other/arch.yml',
        rootDirectory: '../other',
      },
    },
    {
      name: 'reads --format as a separate argument',
      argv: ['--format', 'json'],
      expected: { command: 'check', format: 'json' },
    },
    {
      name: 'reads --format in its inline form',
      argv: ['--format=json'],
      expected: { command: 'check', format: 'json' },
    },
    {
      name: 'combines the check subcommand with both options',
      argv: ['check', '--config', 'arch.yml', '--format', 'json'],
      expected: { command: 'check', format: 'json', configPath: 'arch.yml' },
    },
    {
      name: 'treats --help as a command',
      argv: ['--help'],
      expected: { command: 'help', format: 'console' },
    },
    {
      name: 'treats -h as a command',
      argv: ['-h'],
      expected: { command: 'help', format: 'console' },
    },
    {
      name: 'treats --version as a command',
      argv: ['--version'],
      expected: { command: 'version', format: 'console' },
    },
    {
      name: 'treats -v as a command',
      argv: ['-v'],
      expected: { command: 'version', format: 'console' },
    },
    // Regression: --help used to be parsed after the dangling flag, so asking
    // for help while mistyping an option reported the typo instead of helping.
    {
      name: 'short-circuits on --help before a flag missing its value',
      argv: ['--help', '--config'],
      expected: { command: 'help', format: 'console' },
    },
    {
      name: 'short-circuits on --version before an unknown argument',
      argv: ['--version', 'nonsense'],
      expected: { command: 'version', format: 'console' },
    },
  ];

  for (const { name, argv, expected } of accepted) {
    it(name, () => {
      expect(parse(...argv)).toEqual(expected);
    });
  }

  const rejected: ReadonlyArray<{
    readonly name: string;
    readonly argv: readonly string[];
    readonly message: RegExp;
  }> = [
    {
      name: 'rejects an unknown argument',
      argv: ['--nope'],
      message: /Unknown argument: --nope/,
    },
    {
      name: 'rejects a bare unknown subcommand',
      argv: ['baseline'],
      message: /Unknown argument: baseline/,
    },
    {
      name: 'rejects --config without a value',
      argv: ['--config'],
      message: /--config requires a value/,
    },
    // Regression: --config used to consume the following flag, so this failed
    // with "Unknown argument: json" and pointed at the wrong thing entirely.
    {
      name: 'rejects --config followed by another flag',
      argv: ['--config', '--format', 'json'],
      message: /--config requires a value/,
    },
    {
      name: 'rejects an empty inline --config',
      argv: ['--config='],
      message: /--config requires a value/,
    },
    {
      name: 'rejects --format without a value',
      argv: ['--format'],
      message: /--format requires a value/,
    },
    {
      name: 'rejects --format followed by another flag',
      argv: ['--format', '--config', 'arch.yml'],
      message: /--format requires a value/,
    },
    {
      name: 'rejects --root without a value',
      argv: ['--root'],
      message: /--root requires a value/,
    },
    {
      name: 'rejects --root followed by another flag',
      argv: ['--root', '--format', 'json'],
      message: /--root requires a value/,
    },
    {
      name: 'rejects an empty inline --root',
      argv: ['--root='],
      message: /--root requires a value/,
    },
    {
      name: 'rejects an unsupported format',
      argv: ['--format', 'xml'],
      message: /--format must be console or json/,
    },
  ];

  for (const { name, argv, message } of rejected) {
    it(name, () => {
      expect(() => parse(...argv)).toThrow(message);
    });
  }
});
