import { Injectable } from '@nestjs/common';

@Injectable()
export class NewsletterService {
  private subscribers: string[] = [];

  async subscribe(email: string) {
    if (this.subscribers.includes(email)) {
      return { success: false, message: 'Already subscribed' };
    }
    this.subscribers.push(email);
    console.log('New newsletter subscriber:', email);
    return { success: true, message: 'Successfully subscribed!' };
  }
}
