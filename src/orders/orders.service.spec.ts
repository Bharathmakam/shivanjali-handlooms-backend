import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaxesService } from '../taxes/taxes.service';
import { LogisticsService } from '../logistics/logistics.service';
import { CrmService } from '../crm/crm.service';

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  customerName: 'Test User',
  email: 'test@test.com',
  phone: '9999999999',
  shippingAddress: '123 Main St',
  subtotal: 5000,
  shippingCost: 0,
  gstAmount: 250,
  total: 5250,
  paymentMethod: 'RAZORPAY',
  status: 'PENDING',
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct = {
  id: 'prod-1',
  name: 'Silk Saree',
  price: 5000,
  status: 'ACTIVE',
  quantity: 10,
  category: 'Silk',
  isHandloom: true,
};

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockTaxesService = {
  calculateGST: jest.fn().mockReturnValue({ gstRate: 5, gstAmount: 250, totalBase: 5000, totalService: 0, totalWithTax: 5250 }),
};

const mockLogisticsService = {
  checkCodEligibility: jest.fn().mockReturnValue({ available: true, reason: '' }),
};

const mockCrmService = {
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCodVerification: jest.fn().mockResolvedValue(undefined),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TaxesService, useValue: mockTaxesService },
        { provide: LogisticsService, useValue: mockLogisticsService },
        { provide: CrmService, useValue: mockCrmService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const orderData = {
      items: [{ productId: 'prod-1', name: 'Silk Saree', price: 5000, quantity: 1, fallPico: false }],
      pinCode: '411001',
      paymentMethod: 'RAZORPAY',
      customerDetails: { name: 'Test User', email: 'test@test.com', phone: '9999999999', address: '123 Main St' },
    };

    it('should create an order successfully', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      const result = await service.createOrder(orderData, 'user-1');
      expect(mockPrisma.order.create).toHaveBeenCalled();
    });

    it('should throw if cart is empty', async () => {
      await expect(service.createOrder({ ...orderData, items: [] }, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.createOrder(orderData, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if product is inactive', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, status: 'INACTIVE' });
      await expect(service.createOrder(orderData, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if price has changed', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, price: 6000 });
      await expect(service.createOrder(orderData, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return an order by ID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const result = await service.findOne('order-1');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException for missing order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a PENDING order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'PENDING', items: [{ productId: 'prod-1', quantity: 1 }] });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });
      mockPrisma.product.update.mockResolvedValue(mockProduct);

      const result = await service.cancelOrder('order-1', 'user-1', 'CUSTOMER');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('should throw NotFoundException for missing order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.cancelOrder('nonexistent', 'user-1', 'CUSTOMER')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'PENDING', userId: 'other-user' });
      await expect(service.cancelOrder('order-1', 'user-1', 'CUSTOMER')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is SHIPPED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'SHIPPED', userId: 'user-1' });
      await expect(service.cancelOrder('order-1', 'user-1', 'CUSTOMER')).rejects.toThrow(BadRequestException);
    });

    it('should allow ADMIN to cancel any order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'PENDING', userId: 'other-user', items: [] });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

      const result = await service.cancelOrder('order-1', 'admin-1', 'ADMIN');
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });
  });
});