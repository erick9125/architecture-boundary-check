import { formatMoney } from '../shared/money';

export function charge(cents: number): string {
  return formatMoney(cents);
}
