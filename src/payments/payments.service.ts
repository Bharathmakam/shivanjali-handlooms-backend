import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private razorpay: any;
  private isConfigured: boolean;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    this.isConfigured = !!(
      keyId &&
      keySecret &&
      keyId !== 'rzp_test_placeholder' &&
      keySecret !== 'placeholder_secret'
    );

    if (this.isConfigured) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  async createOrder(amount: number, currency: string = 'INR', receipt: string) {
    if (!this.isConfigured) {
      return {
        id: `mock_order_${Date.now()}`,
        amount: amount * 100,
        currency,
        receipt,
        status: 'created',
      };
    }

    const options = {
      amount: amount * 100,
      currency,
      receipt,
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay Order Creation Error:', error);
      throw new BadRequestException('Payment gateway error. Please try again.');
    }
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
      )
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (!isValid) {
      throw new BadRequestException(
        'Payment verification failed: Invalid signature',
      );
    }

    return true;
  }

  async handleWebhook(payload: any, signature: string, rawBody?: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const webhookBody = rawBody ?? JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;

    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      console.log('Payment captured:', payment.id, 'Order:', payment.order_id);
    }

    if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      console.log('Payment failed:', payment.id, 'Order:', payment.order_id);
    }

    return { success: true };
  }
}
