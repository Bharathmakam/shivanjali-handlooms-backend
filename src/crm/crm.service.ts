import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CrmService {
  private readonly WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://api.interakt.ai/v1/public/message/';
  private readonly WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || 'placeholder_key';

  async sendOrderConfirmation(phoneNumber: string, orderDetails: any) {
    console.log(`Sending WhatsApp confirmation to ${phoneNumber}`);
    // Mocking API call
    /*
    await axios.post(this.WHATSAPP_API_URL, {
      countryCode: '+91',
      phoneNumber: phoneNumber,
      type: 'Template',
      template: {
        name: 'order_confirmation',
        languageCode: 'en',
        bodyValues: [orderDetails.customerName, orderDetails.orderId]
      }
    }, {
      headers: { 'Authorization': `Basic ${this.WHATSAPP_API_KEY}` }
    });
    */
    return { success: true, message: 'Confirmation sent' };
  }

  async sendCodVerification(phoneNumber: string, orderId: string, address: string) {
    console.log(`Sending COD verification to ${phoneNumber} for Order ${orderId}`);
    // PRD: Require user to reply "YES" to confirm
    return { success: true, message: 'Verification message sent' };
  }

  async sendAbandonedCartRecovery(phoneNumber: string, cartLink: string, imageUrl: string) {
    console.log(`Sending abandoned cart recovery to ${phoneNumber}`);
    return { success: true, message: 'Recovery message sent' };
  }
}
