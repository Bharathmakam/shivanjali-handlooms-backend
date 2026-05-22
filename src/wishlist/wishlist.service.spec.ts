import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProduct = { id: 'prod-1', name: 'Silk Saree', price: 5000 };
const mockWishlistItem = {
  id: 'wl-1',
  userId: 'user-1',
  productId: 'prod-1',
  createdAt: new Date(),
  product: mockProduct,
};

const mockPrisma = {
  wishlistItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
};

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return wishlist items for a user', async () => {
      mockPrisma.wishlistItem.findMany.mockResolvedValue([mockWishlistItem]);
      const result = await service.findByUserId('user-1');
      expect(result).toEqual([mockWishlistItem]);
    });
  });

  describe('addItem', () => {
    it('should add a product to wishlist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);
      mockPrisma.wishlistItem.create.mockResolvedValue(mockWishlistItem);

      const result = await service.addItem('user-1', 'prod-1');
      expect(mockPrisma.wishlistItem.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.addItem('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product already in wishlist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(mockWishlistItem);
      await expect(service.addItem('user-1', 'prod-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from wishlist', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(mockWishlistItem);
      mockPrisma.wishlistItem.delete.mockResolvedValue(mockWishlistItem);

      const result = await service.removeItem('user-1', 'prod-1');
      expect(result.message).toContain('removed');
    });

    it('should throw NotFoundException for missing item', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);
      await expect(service.removeItem('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkItem', () => {
    it('should return inWishlist: true if item exists', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(mockWishlistItem);
      const result = await service.checkItem('user-1', 'prod-1');
      expect(result.inWishlist).toBe(true);
    });

    it('should return inWishlist: false if item does not exist', async () => {
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);
      const result = await service.checkItem('user-1', 'prod-1');
      expect(result.inWishlist).toBe(false);
    });
  });
});