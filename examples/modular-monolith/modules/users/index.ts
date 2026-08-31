import { formatMoney } from '../shared/money';

export function getUserLabel(id: string): string {
  return `user:${id} (${formatMoney(0)})`;
}
