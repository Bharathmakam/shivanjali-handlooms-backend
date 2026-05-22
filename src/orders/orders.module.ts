import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxesModule } from '../taxes/taxes.module';
import { LogisticsModule } from '../logistics/logistics.module';
import { CrmModule } from '../crm/crm.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    TaxesModule,
    LogisticsModule,
    CrmModule,
    AuthModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
