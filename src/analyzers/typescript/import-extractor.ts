import * as ts from 'typescript';

export interface ExtractedImport {
  readonly specifier: string;
  readonly kind: 'static-import';
  readonly isTypeOnly: boolean;
  readonly line: number;
  readonly column: number;
}

export function extractImports(sourceFile: ts.SourceFile): readonly ExtractedImport[] {
  const results: ExtractedImport[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      results.push(
        toExtractedImport(
          sourceFile,
          node,
          node.moduleSpecifier.text,
          node.importClause?.isTypeOnly === true,
        ),
      );
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      results.push(
        toExtractedImport(
          sourceFile,
          node,
          node.moduleSpecifier.text,
          node.isTypeOnly,
        ),
      );
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return results;
}

function toExtractedImport(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  specifier: string,
  isTypeOnly: boolean,
): ExtractedImport {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );

  return {
    specifier,
    kind: 'static-import',
    isTypeOnly,
    line: line + 1,
    column: character + 1,
  };
}
