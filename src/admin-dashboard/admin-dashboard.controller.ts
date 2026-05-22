import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }
}
