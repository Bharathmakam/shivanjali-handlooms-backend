import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProduct = {
  id: 'prod-1',
  name: 'Silk Saree',
  description: 'A beautiful silk saree',
  category: 'Silk',
  price: 5000,
  sku: 'SKU001',
  quantity: 10,
  status: 'ACTIVE',
  isHandloom: true,
  images: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    // Mock seed to do nothing
    mockPrisma.product.count.mockResolvedValue(1); // skip seeding

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      const result = await service.findAll();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      const result = await service.findOne('prod-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCategory', () => {
    it('should return products filtered by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      const result = await service.findByCategory('Silk');
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findPaginated', () => {
    it('should return paginated results', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findPaginated(1, 10);
      expect(result.data).toEqual([mockProduct]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(25);

      const result = await service.findPaginated(1, 10);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createData = { name: 'New Saree', price: 3000 };
      mockPrisma.product.create.mockResolvedValue({ ...mockProduct, ...createData });

      const result = await service.create(createData);
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, name: 'Updated Saree' });

      const result = await service.update('prod-1', { name: 'Updated Saree' });
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('prod-1');
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('should throw NotFoundException for missing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});