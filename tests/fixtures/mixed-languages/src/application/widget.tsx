import type { Order } from '../domain/order';

export const Widget = (order: Order) => <span>{order.id}</span>;
