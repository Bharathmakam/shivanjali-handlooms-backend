import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '1234567890',
    password: 'hashedPassword',
    role: 'CUSTOMER',
    isVerified: true,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cart: { deleteMany: jest.fn() },
    address: { deleteMany: jest.fn() },
    order: { findMany: jest.fn() },
    $connect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      mockPrismaService.user.create.mockResolvedValue({ ...mockUser, password: 'hashedNewPassword' });

      const result = await service.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('findOneByEmail', () => {
    it('should find a user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findOneByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findOneByPhone', () => {
    it('should find a user by phone', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOneByPhone('1234567890');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneByEmailOrPhone', () => {
    it('should find a user by email or phone', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOneByEmailOrPhone('test@example.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('markAsVerified', () => {
    it('should mark user as verified', async () => {
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isVerified: true, verifiedAt: new Date() });

      const result = await service.markAsVerified('test@example.com');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { isVerified: true, verifiedAt: expect.any(Date) },
      });
    });
  });

  describe('update', () => {
    it('should update user info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, firstName: 'Updated' });

      const result = await service.update('user-1', { firstName: 'Updated' });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { firstName: 'X' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should hash password when updating password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.update('user-1', { password: 'newPassword123' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updatePassword('test@example.com', 'newHashedPassword');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { password: 'newHashedPassword' },
      });
    });
  });

  describe('deleteUnverified', () => {
    it('should delete unverified user and related records', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockPrismaService.user.findFirst.mockResolvedValue(unverifiedUser);
      mockPrismaService.cart.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.address.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.delete.mockResolvedValue(unverifiedUser);

      await service.deleteUnverified('test@example.com');

      expect(prisma.cart.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.address.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should do nothing if no unverified user found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.deleteUnverified('nonexistent@example.com');

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getDashboardStats('nonexistent@example.com'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return dashboard stats for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockUser, status: 'PENDING', total: 1000, createdAt: new Date() },
        { ...mockUser, status: 'DELIVERED', total: 2000, createdAt: new Date() },
      ]);

      const result = await service.getDashboardStats('test@example.com');
      expect(result).toBeDefined();
      expect(prisma.order.findMany).toHaveBeenCalled();
    });
  });
});