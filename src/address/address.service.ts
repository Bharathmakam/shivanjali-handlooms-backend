import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAddressDto {
  name: string;
  phone: string;
  addressLine: string;
  city?: string;
  state?: string;
  pinCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  name?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  isDefault?: boolean;
}

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async create(userId: string, data: CreateAddressDto) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateAddressDto) {
    const existing = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.address.delete({ where: { id } });
  }

  async getDefault(userId: string) {
    return this.prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
  }
}
