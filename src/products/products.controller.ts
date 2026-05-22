import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    // Backward compatibility: if no page/limit params, return all products
    if (!page && !limit) {
      if (category) {
        return this.productsService.findByCategory(category);
      }
      return this.productsService.findAll();
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    if (category) {
      return this.productsService.findPaginatedByCategory(
        category,
        pageNum,
        limitNum,
        search,
        sort,
      );
    }
    return this.productsService.findPaginated(pageNum, limitNum, search, sort);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() data: any) {
    return this.productsService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}