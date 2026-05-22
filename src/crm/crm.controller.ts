import { Controller, Post, Body } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('confirm-order')
  async confirmOrder(@Body() data: { phone: string; orderDetails: any }) {
    return this.crmService.sendOrderConfirmation(data.phone, data.orderDetails);
  }

  @Post('verify-cod')
  async verifyCod(@Body() data: { phone: string; orderId: string; address: string }) {
    return this.crmService.sendCodVerification(data.phone, data.orderId, data.address);
  }

  @Post('abandoned-cart')
  async abandonedCart(@Body() data: { phone: string; cartLink: string; imageUrl: string }) {
    return this.crmService.sendAbandonedCartRecovery(data.phone, data.cartLink, data.imageUrl);
  }
}
