import { parse } from 'yaml';

export const seedOrder = parse('id: seed') as { id: string };
