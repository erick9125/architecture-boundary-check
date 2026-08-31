import { createOrder } from '../application/create-order';

export function handleCreateOrder(id: string, total: number) {
  return createOrder(id, total);
}
