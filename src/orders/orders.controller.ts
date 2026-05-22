import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

interface JwtRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Body() orderData: any, @Req() req: JwtRequest) {
    const userId = req.user?.id;
    return this.ordersService.createOrder(orderData, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: JwtRequest, @Query('email') email?: string) {
    if (req.user?.role === 'ADMIN') {
      return this.ordersService.findAll();
    }
    if (req.user) {
      return this.ordersService.findByUserId(req.user.id);
    }
    if (email) {
      return this.ordersService.findByEmail(email);
    }
    return this.ordersService.findAll();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: JwtRequest) {
    const userId = req.user?.id;
    const role = req.user?.role;
    const order = await this.ordersService.findOne(id, userId, role);

    // If authenticated and not admin, only allow if order belongs to user
    if (userId && role !== 'ADMIN') {
      if (order.userId !== userId && order.email !== req.user?.email) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    return order;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
  ) {
    return this.ordersService.updateStatus(id, data.status);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Param('id') id: string, @Req() req: JwtRequest) {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new ForbiddenException('Authentication required');
    }
    return this.ordersService.cancelOrder(id, userId, role);
  }
}