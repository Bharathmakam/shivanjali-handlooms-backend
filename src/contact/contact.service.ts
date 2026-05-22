import { Injectable } from '@nestjs/common';

@Injectable()
export class ContactService {
  async submit(data: any) {
    console.log('Contact form submission:', data);
    return { success: true, message: 'Message received. We will contact you soon.' };
  }
}
