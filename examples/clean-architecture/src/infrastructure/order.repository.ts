import { Order } from '../domain/order';

export class OrderRepository {
  save(order: Order): Order {
    return order;
  }
}
