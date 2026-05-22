import { BadRequestException } from '@nestjs/common';

// Mock razorpay before importing
jest.mock('razorpay', () => {
  return class Razorpay {
    orders = {
      create: jest.fn().mockResolvedValue({ id: 'order_123', amount: 50000, currency: 'INR', status: 'created' }),
    };
  };
});

import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  describe('in mock/unconfigured mode', () => {
    beforeEach(() => {
      service = new PaymentsService();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return mock order when Razorpay is not configured', async () => {
      const result = await service.createOrder(500, 'INR', 'receipt_123');

      expect(result.id).toContain('mock_order_');
      expect(result.amount).toBe(50000); // 500 * 100
      expect(result.currency).toBe('INR');
      expect(result.status).toBe('created');
    });

    it('should throw BadRequestException for invalid payment signature', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';

      await expect(
        service.verifyPayment('pay_123', 'order_123', 'invalid_signature_hex'),
      ).rejects.toThrow('Payment verification failed');
    });

    it('should accept valid payment signature', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
      const crypto = require('crypto');
      const body = 'order_123|pay_123';
      const expectedSignature = crypto.createHmac('sha256', 'test_secret_key').update(body).digest('hex');

      const result = await service.verifyPayment('pay_123', 'order_123', expectedSignature);
      expect(result).toBe(true);
    });
  });
});