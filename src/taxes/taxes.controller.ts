import { Controller, Post, Body } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import type { TaxableItem, TaxCalculationResult } from './taxes.service';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post('calculate')
  calculate(@Body() item: TaxableItem): TaxCalculationResult {
    return this.taxesService.calculateGST(item);
  }
}
