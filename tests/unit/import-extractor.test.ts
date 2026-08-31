import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { extractImports } from '../../src/analyzers/typescript/import-extractor.js';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.ts', source, ts.ScriptTarget.ES2022, true);
}

describe('extractImports', () => {
  it('extracts static imports including type-only imports', () => {
    const source = parse(`
import { Order } from '../domain/order';
import type { User } from '../users/user';
`);

    const extracted = extractImports(source);
    expect(extracted).toHaveLength(2);
    expect(extracted[0]?.specifier).toBe('../domain/order');
    expect(extracted[0]?.isTypeOnly).toBe(false);
    expect(extracted[1]?.specifier).toBe('../users/user');
    expect(extracted[1]?.isTypeOnly).toBe(true);
    expect(extracted[0]?.line).toBe(2);
  });

  it('extracts re-export module specifiers', () => {
    const source = parse(`export { InvoiceService } from './invoice.service';`);
    const extracted = extractImports(source);

    expect(extracted).toEqual([
      expect.objectContaining({
        specifier: './invoice.service',
        kind: 'static-import',
      }),
    ]);
  });

  it('does not extract dynamic imports or require calls', () => {
    const source = parse(`
const mod = await import('./something');
const legacy = require('./legacy');
`);

    expect(extractImports(source)).toEqual([]);
  });
});
