import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  phone: '9999999999',
  password: '$2b$10$hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  isVerified: true,
};

// Mock bcrypt at module level since jest.spyOn doesn't work on it
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

const mockUsersService = {
  findOneByEmail: jest.fn(),
  findOneByPhone: jest.fn(),
  findOneByEmailOrPhone: jest.fn(),
  findAdminByEmailOrPhone: jest.fn(),
  create: jest.fn(),
  markAsVerified: jest.fn(),
  deleteUnverified: jest.fn(),
  deleteUnverifiedByPhone: jest.fn(),
  updatePassword: jest.fn(),
};

const mockOtpService = {
  sendOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue(undefined),
};

const mockPrismaService = {
  passwordReset: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockEmailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  isConfigured: true,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      mockUsersService.findOneByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result).toBeDefined();
      expect(result!.email).toBe('test@test.com');
      expect(result!.password).toBeUndefined();
    });

    it('should throw if user is not verified', async () => {
      mockUsersService.findOneByEmailOrPhone.mockResolvedValue({ ...mockUser, isVerified: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('test@test.com', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('should return null if password is wrong', async () => {
      mockUsersService.findOneByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      mockUsersService.findOneByEmailOrPhone.mockResolvedValue(null);
      const result = await service.validateUser('nonexistent@test.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token and user without password', async () => {
      mockJwtService.sign.mockReturnValue('mock-jwt-token');
      const result = await service.login(mockUser);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.password).toBeUndefined();
    });
  });

  describe('register', () => {
    it('should register a new user and send OTP', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockUsersService.findOneByPhone.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockOtpService.sendOtp.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'new@test.com',
        phone: '9999999998',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.message).toContain('Registration successful');
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockOtpService.sendOtp).toHaveBeenCalled();
    });

    it('should throw if verified user already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ ...mockUser, isVerified: true });

      await expect(
        service.register({ email: 'test@test.com', phone: '9999999999', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should delete unverified user and re-register', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ ...mockUser, isVerified: false });
      mockUsersService.findOneByPhone.mockResolvedValue(null);
      mockUsersService.deleteUnverified.mockResolvedValue(undefined);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockOtpService.sendOtp.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'test@test.com',
        phone: '9999999999',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.message).toContain('Registration successful');
      expect(mockUsersService.deleteUnverified).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and return login token', async () => {
      mockOtpService.verifyOtp.mockResolvedValue(undefined);
      mockUsersService.markAsVerified.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.verifyEmail('test@test.com', '123456');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(mockUsersService.markAsVerified).toHaveBeenCalledWith('test@test.com');
    });

    it('should throw if user not found after verification', async () => {
      mockOtpService.verifyOtp.mockResolvedValue(undefined);
      mockUsersService.markAsVerified.mockResolvedValue(null);

      await expect(service.verifyEmail('test@test.com', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminLogin', () => {
    it('should login as admin with valid credentials', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      mockUsersService.findAdminByEmailOrPhone.mockResolvedValue(adminUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.adminLogin('admin@test.com', 'password');
      expect(result.access_token).toBe('mock-jwt-token');
    });

    it('should throw for invalid admin credentials', async () => {
      mockUsersService.findAdminByEmailOrPhone.mockResolvedValue(null);
      await expect(service.adminLogin('admin@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token and send email for existing user', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockPrismaService.passwordReset.create.mockResolvedValue({ id: '1', token: 'abc', email: 'test@test.com' });
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@test.com');
      expect(result.message).toContain('reset link');
      expect(mockPrismaService.passwordReset.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return same message for non-existent user (security)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('nobody@test.com');
      expect(result.message).toContain('reset link');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        token: 'valid-token',
        email: 'test@test.com',
        expiresAt: futureDate,
      });
      mockUsersService.updatePassword.mockResolvedValue(mockUser);
      mockPrismaService.passwordReset.delete.mockResolvedValue({});

      const result = await service.resetPassword('test@test.com', 'valid-token', 'newpassword');
      expect(result.message).toContain('reset successfully');
      expect(mockUsersService.updatePassword).toHaveBeenCalled();
    });

    it('should throw for invalid token', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('test@test.com', 'bad-token', 'newpassword')).rejects.toThrow(BadRequestException);
    });

    it('should throw for expired token', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        token: 'expired-token',
        email: 'test@test.com',
        expiresAt: pastDate,
      });
      mockPrismaService.passwordReset.delete.mockResolvedValue({});

      await expect(service.resetPassword('test@test.com', 'expired-token', 'newpassword')).rejects.toThrow(BadRequestException);
    });

    it('should throw if email does not match token', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        token: 'valid-token',
        email: 'other@test.com',
        expiresAt: futureDate,
      });

      await expect(service.resetPassword('test@test.com', 'valid-token', 'newpassword')).rejects.toThrow(BadRequestException);
    });
  });
});