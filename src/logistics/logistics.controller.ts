import { Controller, Get, Query } from '@nestjs/common';
import { LogisticsService } from './logistics.service';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('check-cod')
  checkCod(
    @Query('pinCode') pinCode: string,
    @Query('orderValue') orderValue: string,
  ) {
    return this.logisticsService.checkCodEligibility(pinCode, parseFloat(orderValue));
  }
}
