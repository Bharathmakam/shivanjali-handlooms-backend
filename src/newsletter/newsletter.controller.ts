import { Controller, Post, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() data: any) {
    return this.newsletterService.subscribe(data.email);
  }
}
