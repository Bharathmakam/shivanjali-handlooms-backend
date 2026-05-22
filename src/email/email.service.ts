import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  get isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!this.resend) {
      console.log(`\n===== OTP for ${to} =====`);
      console.log(`OTP Code: ${otp}`);
      console.log(`(RESEND_API_KEY not set — email not sent)`);
      console.log(`============================\n`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: `"Shivanjali Handlooms" <${this.fromEmail}>`,
      to,
      subject: 'Verify Your Email - Shivanjali Handlooms',
      html: `
        <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8ddd0;">
          <div style="background: linear-gradient(135deg, #8b1538 0%, #a91d45 100%); padding: 30px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 2px;">SHIVANJALI</h1>
            <p style="color: #f0d0d8; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 4px;">HANDLOOMS</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #8b1538; font-size: 22px; margin-bottom: 20px;">Welcome to Shivanjali Handlooms!</h2>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Thank you for registering with us. Please verify your email address using the OTP below:</p>
            <div style="background: linear-gradient(135deg, #faf6f0 0%, #f5ede3 100%); padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #d4b896;">
              <h1 style="color: #8b1538; margin: 0; letter-spacing: 12px; font-size: 36px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">This OTP is valid for <strong>10 minutes</strong>. If you did not create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e8ddd0; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Shivanjali Handlooms &mdash; Authentic Traditional Weaves<br/>Handloom Certified | Artisan Made | Made in India</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send OTP email via Resend:', error);
      // Don't throw — fall back to console log so registration still works
    } else {
      console.log(`OTP email sent to ${to} via Resend`);
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      console.log(`\n===== PASSWORD RESET for ${to} =====`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`(RESEND_API_KEY not set — email not sent)`);
      console.log(`============================\n`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: `"Shivanjali Handlooms" <${this.fromEmail}>`,
      to,
      subject: 'Reset Your Password - Shivanjali Handlooms',
      html: `
        <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8ddd0;">
          <div style="background: linear-gradient(135deg, #8b1538 0%, #a91d45 100%); padding: 30px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 2px;">SHIVANJALI</h1>
            <p style="color: #f0d0d8; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 4px;">HANDLOOMS</p>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #8b1538; font-size: 22px; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #8b1538 0%, #a91d45 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 1px;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">This link is valid for <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.</p>
            <p style="color: #999; font-size: 13px; line-height: 1.6;">Alternatively, copy and paste this link in your browser:<br/><a href="${resetUrl}" style="color: #8b1538; word-break: break-all;">${resetUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #e8ddd0; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Shivanjali Handlooms &mdash; Authentic Traditional Weaves<br/>Handloom Certified | Artisan Made | Made in India</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send reset email via Resend:', error);
      // Don't throw — fall back gracefully
    } else {
      console.log(`Password reset email sent to ${to} via Resend`);
    }
  }
}