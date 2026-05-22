import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [products, orders, users] = await Promise.all([
      this.prisma.product.findMany(),
      this.prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.user.findMany({ where: { role: 'CUSTOMER' } }),
    ]);

    const totalProducts = products.length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
    const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED').length;
    const processingOrders = orders.filter((o) => o.status === 'PROCESSING').length;
    const shippedOrders = orders.filter((o) => o.status === 'SHIPPED').length;
    const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
    const totalRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const totalCustomers = users.length;

    const recentOrders = orders.slice(0, 10).map((o) => ({
      id: o.id,
      customerName: o.customerName,
      email: o.email,
      total: Number(o.total),
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
    }));

    const ordersByCategory: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      const items = order.items as any[];
      for (const item of items) {
        const cat = item.category || 'Unknown';
        if (!ordersByCategory[cat]) {
          ordersByCategory[cat] = { count: 0, revenue: 0 };
        }
        ordersByCategory[cat].count += item.quantity || 1;
        ordersByCategory[cat].revenue += Number(item.price) * (item.quantity || 1);
      }
    }

    const topProducts: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
      const items = order.items as any[];
      for (const item of items) {
        const name = item.name || 'Unknown';
        if (!topProducts[name]) {
          topProducts[name] = { count: 0, revenue: 0 };
        }
        topProducts[name].count += item.quantity || 1;
        topProducts[name].revenue += Number(item.price) * (item.quantity || 1);
      }
    }

    const topProductsList = Object.entries(topProducts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueByDay: Record<string, number> = {};
    for (const order of orders) {
      if (order.status === 'CANCELLED') continue;
      const day = new Date(order.createdAt).toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(order.total);
    }

    const revenueChartData = Object.entries(revenueByDay)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return {
      totalProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      totalCustomers,
      recentOrders,
      ordersByCategory,
      topProducts: topProductsList,
      revenueChartData,
    };
  }
}
