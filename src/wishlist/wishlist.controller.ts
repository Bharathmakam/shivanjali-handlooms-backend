import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface JwtRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async findAll(@Req() req: JwtRequest) {
    return this.wishlistService.findByUserId(req.user.id);
  }

  @Post()
  async add(@Body() body: { productId: string }, @Req() req: JwtRequest) {
    return this.wishlistService.addItem(req.user.id, body.productId);
  }

  @Delete(':productId')
  async remove(@Param('productId') productId: string, @Req() req: JwtRequest) {
    return this.wishlistService.removeItem(req.user.id, productId);
  }

  @Get('check/:productId')
  async check(@Param('productId') productId: string, @Req() req: JwtRequest) {
    return this.wishlistService.checkItem(req.user.id, productId);
  }
}