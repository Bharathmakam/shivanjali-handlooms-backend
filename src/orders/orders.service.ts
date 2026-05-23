import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogisticsService } from '../logistics/logistics.service';
import { CrmService } from '../crm/crm.service';

const FREE_SHIPPING_THRESHOLD = 5000;
const STANDARD_SHIPPING_COST = 99;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private logisticsService: LogisticsService,
    private crmService: CrmService,
  ) {}

  private getShippingCost(subtotal: number): number {
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  }

  async createOrder(orderData: any, userId?: string) {
    const {
      items,
      pinCode,
      paymentMethod,
      customerDetails,
      razorpayOrderId,
      razorpayPaymentId,
    } = orderData;

    if (!items || items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new BadRequestException(`Product "${item.name}" not found`);
      }

      if (product.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Product "${product.name}" is not available`,
        );
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Only ${product.quantity} of "${product.name}" available in stock`,
        );
      }

      if (Math.abs(product.price - item.price) > 0.01) {
        throw new BadRequestException(
          `Price of "${product.name}" has changed. Please refresh your cart.`,
        );
      }

      const itemTotal = product.price * item.quantity;

      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const shippingCost = this.getShippingCost(subtotal);

    if (paymentMethod === 'COD') {
      const codCheck = this.logisticsService.checkCodEligibility(
        pinCode,
        subtotal,
      );
      if (!codCheck.available) {
        throw new BadRequestException(codCheck.reason);
      }
    }

    const savedOrder = await this.prisma.order.create({
      data: {
        userId: userId || null,
        customerName: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phone,
        shippingAddress: customerDetails.address,
        pinCode,
        city: customerDetails.city || null,
        state: customerDetails.state || null,
        items: validatedItems,
        subtotal,
        shippingCost,
        gstAmount: 0,
        total: subtotal + shippingCost,
        paymentMethod,
        razorpayOrderId: razorpayOrderId || null,
        paymentId: razorpayPaymentId || null,
      },
    });

    for (const item of validatedItems) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    await this.crmService.sendOrderConfirmation(savedOrder.phone, {
      customerName: savedOrder.customerName,
      orderId: savedOrder.id,
      total: savedOrder.total,
    });

    if (paymentMethod === 'COD') {
      await this.crmService.sendCodVerification(
        savedOrder.phone,
        savedOrder.id,
        savedOrder.shippingAddress,
      );
    }

    return savedOrder;
  }

  async findOne(id: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Access control: if userId is provided and role is not ADMIN, check ownership
    if (userId && role !== 'ADMIN') {
      if (order.userId !== userId) {
        // Also check by email for guest orders that match the user's email
        // The controller does the fine-grained email check; here we just return the order
        // and let the controller enforce the policy
      }
    }

    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async cancelOrder(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Only allow customer to cancel their own order
    if (role !== 'ADMIN' && order.userId !== userId && order.email !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Only allow cancellation if status is PENDING or CONFIRMED
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}`,
      );
    }

    // Restore product quantities
    const items = order.items as any[];
    for (const item of items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}