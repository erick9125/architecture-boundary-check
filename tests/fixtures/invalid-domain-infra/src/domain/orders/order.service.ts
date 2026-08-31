import { OrderRepository } from '../../infrastructure/database/order.repository';

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}
}
