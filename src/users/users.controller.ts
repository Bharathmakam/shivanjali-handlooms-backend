import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    const user = await this.usersService.findOneByEmail(req.user.email);
    if (!user) {
      return { error: 'User not found' };
    }
    const { password, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() data: any) {
    const user = await this.usersService.findOneByEmail(req.user.email);
    if (!user) {
      return { error: 'User not found' };
    }
    return this.usersService.update(user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/stats')
  async getDashboardStats(@Req() req: any) {
    return this.usersService.getDashboardStats(req.user.email);
  }
}
