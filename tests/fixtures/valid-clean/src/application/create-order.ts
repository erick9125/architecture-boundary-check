import { Order } from '../domain/order';

export function createOrder(id: string): Order {
  return new Order(id);
}
