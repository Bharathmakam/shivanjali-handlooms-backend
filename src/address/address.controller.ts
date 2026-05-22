import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AddressService, type CreateAddressDto, type UpdateAddressDto } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface JwtRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  async findAll(@Req() req: JwtRequest) {
    return this.addressService.findAll(req.user.id);
  }

  @Get('default')
  async getDefault(@Req() req: JwtRequest) {
    return this.addressService.getDefault(req.user.id);
  }

  @Get(':id')
  async findOne(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.addressService.findOne(req.user.id, id);
  }

  @Post()
  async create(@Req() req: JwtRequest, @Body() data: CreateAddressDto) {
    return this.addressService.create(req.user.id, data);
  }

  @Put(':id')
  async update(@Req() req: JwtRequest, @Param('id') id: string, @Body() data: UpdateAddressDto) {
    return this.addressService.update(req.user.id, id, data);
  }

  @Delete(':id')
  async remove(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.addressService.remove(req.user.id, id);
  }
}
