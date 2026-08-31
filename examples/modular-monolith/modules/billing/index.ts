import { formatMoney } from '../shared/money';

export function invoiceTotal(cents: number): string {
  return formatMoney(cents);
}
