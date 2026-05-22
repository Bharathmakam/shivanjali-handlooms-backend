import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { OtpService } from './otp.service';
import { IsEmail, IsString, IsNotEmpty, Length } from 'class-validator';

class SendOtpDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

class VerifyOtpDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async sendOtp(@Body() data: SendOtpDto) {
    return this.otpService.sendOtp(data.email);
  }

  @Post('verify')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyOtp(@Body() data: VerifyOtpDto) {
    return this.otpService.verifyOtp(data.email, data.otp);
  }

  @Post('resend')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resendOtp(@Body() data: SendOtpDto) {
    return this.otpService.resendOtp(data.email);
  }
}
