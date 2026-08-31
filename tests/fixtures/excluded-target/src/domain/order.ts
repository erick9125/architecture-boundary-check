import { OrderRepository } from '../infrastructure/order.repository.js';

export class Order {
  constructor(private readonly repository: OrderRepository) {}
}
