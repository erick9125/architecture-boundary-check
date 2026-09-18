import type { Order } from '../domain/order';

export function createOrder(id: string): Order {
  return { id };
}
