import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query('keyword') keyword?: string, @Query('category') category?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.productsService.list(keyword, category, Number(page || 1), Number(pageSize || 10));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.productsService.detail(id);
  }
}
