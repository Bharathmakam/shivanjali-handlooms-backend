import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TaxesModule } from './taxes/taxes.module';
import { ProductsModule } from './products/products.module';
import { PaymentsModule } from './payments/payments.module';
import { CrmModule } from './crm/crm.module';
import { LogisticsModule } from './logistics/logistics.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ContactModule } from './contact/contact.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { UploadModule } from './upload/upload.module';
import { CartModule } from './cart/cart.module';
import { AddressModule } from './address/address.module';
import { OtpModule } from './otp/otp.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    PrismaModule,
    TaxesModule,
    ProductsModule,
    PaymentsModule,
    CrmModule,
    LogisticsModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    ContactModule,
    NewsletterModule,
    AdminDashboardModule,
    UploadModule,
    CartModule,
    AddressModule,
    OtpModule,
    WishlistModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}