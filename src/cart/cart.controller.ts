import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CartService, type CartItemDto } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface JwtRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: JwtRequest) {
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @Post('items')
  async addItem(@Req() req: JwtRequest, @Body() item: CartItemDto) {
    return this.cartService.addItem(req.user.id, item);
  }

  @Patch('items/:id')
  async updateItem(@Req() req: JwtRequest, @Param('id') id: string, @Body() data: { quantity?: number; fallPico?: boolean }) {
    if (data.quantity !== undefined) {
      return this.cartService.updateItemQuantity(req.user.id, id, data.quantity);
    }
    if (data.fallPico !== undefined) {
      return this.cartService.toggleFallPico(req.user.id, id, data.fallPico);
    }
    return this.cartService.getOrCreateCart(req.user.id);
  }

  @Delete('items/:id')
  async removeItem(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Delete('clear')
  async clearCart(@Req() req: JwtRequest) {
    return this.cartService.clearCart(req.user.id);
  }

  @Post('merge')
  async mergeCartItems(@Req() req: JwtRequest, @Body() data: { items: CartItemDto[] }) {
    return this.cartService.mergeCartItems(req.user.id, data.items);
  }

  @Post('validate')
  async validateCart(@Req() req: JwtRequest) {
    return this.cartService.validateCartForCheckout(req.user.id);
  }
}
