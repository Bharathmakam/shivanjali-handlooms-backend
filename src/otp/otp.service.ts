import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(email: string) {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.deleteMany({
      where: { email },
    });

    await this.prisma.otpVerification.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    });

    // Always log OTP for dev visibility
    console.log(`\n===== OTP for ${email} =====`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires: ${expiresAt.toLocaleString()}`);
    console.log(`============================\n`);

    // Send email (uses Resend if configured, console fallback otherwise)
    await this.emailService.sendOtpEmail(email, otp);

    return { message: 'OTP sent successfully', expiresIn: 600 };
  }

  async verifyOtp(email: string, otp: string) {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        otp,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otpVerification.deleteMany({
      where: { email },
    });

    return { verified: true };
  }

  async resendOtp(email: string) {
    const existing = await this.prisma.otpVerification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const timeSinceCreated = Date.now() - existing.createdAt.getTime();
      const cooldown = 60 * 1000;
      if (timeSinceCreated < cooldown) {
        const remaining = Math.ceil((cooldown - timeSinceCreated) / 1000);
        throw new BadRequestException(`Please wait ${remaining} seconds before requesting a new OTP`);
      }
    }

    return this.sendOtp(email);
  }
}