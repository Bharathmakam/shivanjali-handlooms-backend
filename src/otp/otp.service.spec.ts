import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BadRequestException } from '@nestjs/common';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: PrismaService;

  const mockPrismaService = {
    otpVerification: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $connect: jest.fn(),
  };

  const mockEmailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    isConfigured: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = service.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate different OTPs on each call', () => {
      // Very unlikely two calls produce same result
      const otps = new Set(Array.from({ length: 10 }, () => service.generateOtp()));
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  describe('sendOtp', () => {
    it('should delete existing OTPs and create a new one', async () => {
      mockPrismaService.otpVerification.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.otpVerification.create.mockResolvedValue({});

      const result = await service.sendOtp('test@example.com');

      expect(prisma.otpVerification.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(prisma.otpVerification.create).toHaveBeenCalled();
      expect(result.message).toBe('OTP sent successfully');
      expect(result.expiresIn).toBe(600);
    });
  });

  describe('verifyOtp', () => {
    it('should verify a valid OTP', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockPrismaService.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        email: 'test@example.com',
        otp: '123456',
        expiresAt: futureDate,
      });
      mockPrismaService.otpVerification.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result).toEqual({ verified: true });
      expect(prisma.otpVerification.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw BadRequestException for invalid or expired OTP', async () => {
      mockPrismaService.otpVerification.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp('test@example.com', '000000'))
        .rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp('test@example.com', '000000'))
        .rejects.toThrow('Invalid or expired OTP');
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP if cooldown has passed', async () => {
      const pastDate = new Date(Date.now() - 120000); // 2 min ago
      mockPrismaService.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        email: 'test@example.com',
        createdAt: pastDate,
      });
      mockPrismaService.otpVerification.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.otpVerification.create.mockResolvedValue({});

      const result = await service.resendOtp('test@example.com');
      expect(result.message).toBe('OTP sent successfully');
    });

    it('should throw BadRequestException if within cooldown period', async () => {
      const recentDate = new Date(Date.now() - 30000); // 30 sec ago
      mockPrismaService.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        email: 'test@example.com',
        createdAt: recentDate,
      });

      await expect(service.resendOtp('test@example.com'))
        .rejects.toThrow(BadRequestException);
      await expect(service.resendOtp('test@example.com'))
        .rejects.toThrow('Please wait');
    });
  });
});