import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CartItemDto {
  productId: string;
  quantity?: number;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: unknown;
    quantity: number;
    isHandloom: boolean;
  };
  quantity: number;
  itemTotal: number;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  itemCount: number;
  subtotal: number;
  shippingCost: number;
  total: number;
}

interface CartItemWithProduct {
  id: string;
  productId: string;
  product: CartItemResponse['product'];
  quantity: number;
}

interface CartForResponse {
  id: string;
  items: CartItemWithProduct[];
}

const FREE_SHIPPING_THRESHOLD = 5000;
const STANDARD_SHIPPING_COST = 99;

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private getShippingCost(subtotal: number): number {
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  }

  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                quantity: true,
                isHandloom: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: true,
                  quantity: true,
                  isHandloom: true,
                },
              },
            },
          },
        },
      });
    }

    return this.formatCartResponse(cart);
  }

  async addItem(userId: string, item: CartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('Product is not available');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    const requestedQuantity = item.quantity ?? 1;
    if (requestedQuantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const existingItem = cart.items.find(
      (ci) => ci.productId === item.productId,
    );

    const nextQuantity = (existingItem?.quantity ?? 0) + requestedQuantity;
    if (nextQuantity > product.quantity) {
      throw new BadRequestException(
        `Only ${product.quantity} of "${product.name}" available in stock`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + requestedQuantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              quantity: true,
              isHandloom: true,
            },
          },
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: item.productId,
          quantity: requestedQuantity,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              quantity: true,
              isHandloom: true,
            },
          },
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    cartItemId: string,
    quantity: number,
  ) {
    if (quantity < 1) {
      return this.removeItem(userId, cartItemId);
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity > cartItem.product.quantity) {
      throw new BadRequestException(
        `Only ${cartItem.product.quantity} of "${cartItem.product.name}" available in stock`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            quantity: true,
            isHandloom: true,
          },
        },
      },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return this.getOrCreateCart(userId);
  }

  async mergeCartItems(userId: string, localItems: CartItemDto[]) {
    if (!localItems || localItems.length === 0) {
      return this.getOrCreateCart(userId);
    }

    for (const item of localItems) {
      try {
        await this.addItem(userId, item);
      } catch {
        continue;
      }
    }

    return this.getOrCreateCart(userId);
  }

  async validateCartForCheckout(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const validationErrors: string[] = [];

    for (const item of cart.items) {
      if (item.product.quantity < item.quantity) {
        validationErrors.push(
          `Only ${item.product.quantity} of "${item.product.name}" available in stock`,
        );
      }
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    return cart;
  }

  private formatCartResponse(cart: CartForResponse): CartResponse {
    const items: CartItemResponse[] = cart.items.map((ci) => {
      const itemTotal = ci.product.price * ci.quantity;

      return {
        id: ci.id,
        productId: ci.productId,
        product: ci.product,
        quantity: ci.quantity,
        itemTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
    const shippingCost = this.getShippingCost(subtotal);

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
    };
  }
}