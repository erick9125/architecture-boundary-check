import path from 'node:path';
import * as ts from 'typescript';
import { toPosixPath } from '../../core/paths.js';

export function resolveImportedModule(
  specifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
  host: ts.ModuleResolutionHost,
  projectRoot: string,
  cache?: ts.ModuleResolutionCache,
): string | undefined {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    host,
    cache,
  );

  const resolved = result.resolvedModule?.resolvedFileName;
  if (!resolved) {
    return undefined;
  }

  if (result.resolvedModule.isExternalLibraryImport === true) {
    return undefined;
  }

  const posix = toPosixPath(resolved);
  if (posix.includes('/node_modules/')) {
    return undefined;
  }

  if (!isInsideRoot(resolved, projectRoot)) {
    return undefined;
  }

  return path.normalize(resolved);
}

function isInsideRoot(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
