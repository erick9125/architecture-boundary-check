import path from 'node:path';
import * as ts from 'typescript';
import { toPosixPath } from '../../core/paths.js';

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
    const message = ts.flattenDiagnosticMessageText(read.error.messageText, '\n');
    throw new Error(`Failed to read TypeScript config ${configPath}: ${message}`);
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
  );

  return {
    compilerOptions: {
      ...parsed.options,
      noEmit: true,
      allowJs: parsed.options.allowJs ?? true,
    },
    configPath: toPosixPath(configPath),
  };
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
