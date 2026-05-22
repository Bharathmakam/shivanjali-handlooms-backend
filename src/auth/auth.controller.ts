import { Controller, Post, Body, UnauthorizedException, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { IsEmail, IsString, IsNotEmpty, Length, MinLength } from 'class-validator';

class VerifyEmailDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}

class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

class ResetPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.identifier, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyEmail(@Body() data: VerifyEmailDto) {
    return this.authService.verifyEmail(data.email, data.otp);
  }

  @Post('admin/login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto.identifier, loginDto.password);
  }

  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data.email, data.token, data.newPassword);
  }
}