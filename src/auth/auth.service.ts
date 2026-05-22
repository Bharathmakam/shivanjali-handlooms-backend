import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private otpService: OtpService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmailOrPhone(identifier);
    if (user && await bcrypt.compare(pass, user.password)) {
      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your email before logging in');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const { password, ...safeUser } = user;
    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
    };
  }

  async register(userData: any) {
    const existingUser = await this.usersService.findOneByEmail(userData.email);
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new UnauthorizedException('User already exists');
      }
      await this.usersService.deleteUnverified(userData.email);
    }

    const existingPhone = await this.usersService.findOneByPhone(userData.phone);
    if (existingPhone) {
      if (existingPhone.isVerified) {
        throw new UnauthorizedException('Phone number already registered');
      }
      await this.usersService.deleteUnverifiedByPhone(userData.phone);
    }

    const user = await this.usersService.create(userData);

    await this.otpService.sendOtp(user.email);

    const { password, ...safeUser } = user;
    return {
      message: 'Registration successful. Please verify your email with the OTP sent to your email.',
      user: safeUser,
    };
  }

  async verifyEmail(email: string, otp: string) {
    await this.otpService.verifyOtp(email, otp);

    const user = await this.usersService.markAsVerified(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.login(user);
  }

  async adminLogin(identifier: string, pass: string) {
    const user = await this.usersService.findAdminByEmailOrPhone(identifier);
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const { password, ...result } = user;
    return this.login(result);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Don't reveal whether user exists — return same message either way
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await this.emailService.sendPasswordResetEmail(email, resetUrl);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetRecord.email !== email) {
      throw new BadRequestException('Email does not match reset token');
    }

    if (resetRecord.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.passwordReset.delete({ where: { token } });
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(email, hashedPassword);

    // Delete the used token
    await this.prisma.passwordReset.delete({ where: { token } });

    return { message: 'Password has been reset successfully' };
  }
}