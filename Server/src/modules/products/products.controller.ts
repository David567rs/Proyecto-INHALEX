import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  listPublicCategories() {
    return this.productsService.listPublicCategories();
  }

  @Get()
  listPublic(@Query() query: ListProductsQueryDto) {
    return this.productsService.listPublic(query);
  }

  @Get(':idOrSlug')
  findOnePublic(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOnePublic(idOrSlug);
  }
}
