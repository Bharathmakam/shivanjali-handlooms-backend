import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(userData: any): Promise<any> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return this.prisma.user.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        role: 'CUSTOMER',
      },
    });
  }

  async findOneByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findOneByPhone(phone: string): Promise<any | null> {
    return this.prisma.user.findFirst({ where: { phone } });
  }

  async findOneByEmailOrPhone(identifier: string): Promise<any | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAdminByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({ where: { email, role: 'ADMIN' } });
  }

  async findAdminByEmailOrPhone(identifier: string): Promise<any | null> {
    return this.prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  async markAsVerified(email: string): Promise<any | null> {
    return this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  async deleteUnverified(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, isVerified: false },
    });

    if (!user) return;

    await this.prisma.cart.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.address.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.user.delete({
      where: { id: user.id },
    });
  }

  async deleteUnverifiedByPhone(phone: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { phone, isVerified: false },
    });

    if (!user) return;

    await this.prisma.cart.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.address.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.user.delete({
      where: { id: user.id },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone) updateData.phone = data.phone;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updatePassword(email: string, hashedPassword: string): Promise<any> {
    return this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }

  async getDashboardStats(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const orders = await this.prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);

    const recentOrders = orders.slice(0, 5).map((o) => ({
      id: o.id,
      customerName: o.customerName,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
      items: o.items,
    }));

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpent,
      recentOrders,
    };
  }
}
