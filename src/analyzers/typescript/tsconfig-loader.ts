import path from 'node:path';
import * as ts from 'typescript';
import { AnalyzerError } from '../../core/errors.js';
import { toPosixPath } from '../../core/paths.js';

/**
 * Diagnostics about which files the config selects, which say nothing about
 * whether the options are usable. The analyzer supplies its own file list, so a
 * tsconfig with an empty `files` array — a project-references stub, say — is
 * perfectly analyzable and must not fail the run.
 *
 * 18002: the `files` list in the config is empty.
 * 18003: no inputs were found in the config.
 */
const IGNORED_DIAGNOSTICS = new Set([18002, 18003]);

export function loadTsConfig(rootDirectory: string): {
  readonly compilerOptions: ts.CompilerOptions;
  readonly configPath: string | undefined;
} {
  const configPath = ts.findConfigFile(
    rootDirectory,
    (candidate) => ts.sys.fileExists(candidate),
    'tsconfig.json',
  );

  if (!configPath) {
    return {
      compilerOptions: defaultCompilerOptions(rootDirectory),
      configPath: undefined,
    };
  }

  const read = ts.readConfigFile(configPath, (fileName) => ts.sys.readFile(fileName));
  if (read.error) {
    throw new AnalyzerError(
      `Failed to read TypeScript config ${configPath}:\n${describe([read.error])}`,
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
  );

  // Left unchecked, a broken tsconfig yields empty options: aliases stop
  // resolving, those imports never reach the graph, and the run passes because
  // it stopped seeing the dependencies rather than because there are none.
  const fatal = parsed.errors.filter(
    (diagnostic) => !IGNORED_DIAGNOSTICS.has(diagnostic.code),
  );

  if (fatal.length > 0) {
    throw new AnalyzerError(
      `Failed to parse TypeScript config ${configPath}:\n${describe(fatal)}`,
    );
  }

  return {
    compilerOptions: {
      ...parsed.options,
      noEmit: true,
      allowJs: parsed.options.allowJs ?? true,
    },
    configPath: toPosixPath(configPath),
  };
}

function describe(diagnostics: readonly ts.Diagnostic[]): string {
  return diagnostics
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )
    .join('\n');
}

function defaultCompilerOptions(rootDirectory: string): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    noEmit: true,
    baseUrl: rootDirectory,
    esModuleInterop: true,
  };
}
