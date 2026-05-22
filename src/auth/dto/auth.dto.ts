import { IsEmail, IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone number is required' })
  identifier: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
