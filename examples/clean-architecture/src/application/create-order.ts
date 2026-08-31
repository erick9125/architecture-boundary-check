import { Order } from '../domain/order';

export function createOrder(id: string, total: number): Order {
  return new Order(id, total);
}
