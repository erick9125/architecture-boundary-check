import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesRoot = fileURLToPath(new URL('../fixtures', import.meta.url));

export function fixtureDir(name: string): string {
  return path.join(fixturesRoot, name);
}
