import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addItem(userId: string, productId: string) {
    // Check product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if already in wishlist (unique constraint will also catch this)
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    if (existing) {
      throw new BadRequestException('Product already in wishlist');
    }

    return this.prisma.wishlistItem.create({
      data: { userId, productId },
      include: { product: true },
    });
  }

  async removeItem(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return { message: 'Item removed from wishlist' };
  }

  async checkItem(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    return { inWishlist: !!item };
  }
}