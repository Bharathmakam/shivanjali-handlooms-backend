import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  async createOrder(@Body() data: { amount: number; receipt: string }) {
    return this.paymentsService.createOrder(data.amount, 'INR', data.receipt);
  }

  @Post('verify')
  async verifyPayment(
    @Body() data: { paymentId: string; orderId: string; signature: string },
  ) {
    return this.paymentsService.verifyPayment(
      data.paymentId,
      data.orderId,
      data.signature,
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(
      payload,
      signature,
      req.rawBody?.toString('utf8'),
    );
  }
}
