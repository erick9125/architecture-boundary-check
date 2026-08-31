import { PaymentClient } from '../../infrastructure/http/payment.client';

export class PaymentHandler {
  constructor(private readonly client: PaymentClient) {}
}
