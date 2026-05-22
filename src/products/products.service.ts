import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedProducts();
  }

  private async seedProducts() {
    const count = await this.prisma.product.count();
    if (count > 0) return;

    const csvPath = path.resolve(
      __dirname,
      '../../../shivanjali_handlooms_products.csv',
    );
    if (!fs.existsSync(csvPath)) {
      console.warn('CSV file not found at', csvPath);
      return;
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of records) {
      await this.prisma.product.create({
        data: {
          name: record.Name,
          description: record.Description,
          category: record.Category,
          price: parseFloat(record.Price),
          sku: record.SKU,
          quantity: parseInt(record.Quantity),
          status: record.Status,
          isHandloom: !record.Category.includes('Fancy'),
        },
      });
    }
    console.log(`Seeded ${records.length} products from CSV.`);
  }

  findAll() {
    return this.prisma.product.findMany();
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  findByCategory(category: string) {
    return this.prisma.product.findMany({ where: { category } });
  }

  private buildSearchWhere(search?: string, category?: string): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private getOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  async findPaginated(
    page: number,
    limit: number,
    search?: string,
    sort?: string,
  ) {
    const where = this.buildSearchWhere(search);
    const orderBy = this.getOrderBy(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPaginatedByCategory(
    category: string,
    page: number,
    limit: number,
    search?: string,
    sort?: string,
  ) {
    const where = this.buildSearchWhere(search, category);
    const orderBy = this.getOrderBy(sort);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: any) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        price: parseFloat(data.price),
        sku: data.sku || '',
        quantity: data.quantity ? parseInt(data.quantity) : 0,
        status: data.status || 'ACTIVE',
        isHandloom: data.isHandloom ?? true,
        images: data.images || [],
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        price:
          data.price !== undefined ? parseFloat(data.price) : existing.price,
        sku: data.sku ?? existing.sku,
        quantity:
          data.quantity !== undefined
            ? parseInt(data.quantity)
            : existing.quantity,
        status: data.status ?? existing.status,
        isHandloom: data.isHandloom ?? existing.isHandloom,
        images: data.images ?? existing.images,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.delete({ where: { id } });
  }
}