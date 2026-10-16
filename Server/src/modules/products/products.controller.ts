import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  listPublicCategories() {
    return this.productsService.listPublicCategories();
  }

  @Get()
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  listPublic(@Query() query: ListProductsQueryDto) {
    return this.productsService.listPublic(query);
  }

  @Get(':idOrSlug')
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  findOnePublic(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOnePublic(idOrSlug);
  }
}
