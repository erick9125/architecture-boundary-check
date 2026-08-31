import { Order } from '@/domain/order';

export function createOrder(): Order {
  return new Order();
}
