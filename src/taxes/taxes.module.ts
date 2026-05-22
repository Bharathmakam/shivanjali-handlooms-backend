import { Module } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';

@Module({
  providers: [TaxesService],
  controllers: [TaxesController],
  exports: [TaxesService],
})
export class TaxesModule {}
