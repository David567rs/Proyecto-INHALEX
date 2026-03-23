import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ImportProductsCsvDto } from './dto/import-products-csv.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductsService } from './products.service';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('seed-defaults')
  seedDefaults() {
    return this.productsService.seedDefaults();
  }

  @Get()
  listAdmin(@Query() query: ListProductsQueryDto) {
    return this.productsService.listAdmin(query);
  }

  @Get('csv')
  async exportAdminCsv(
    @Query() query: ListProductsQueryDto,
    @Res() response: Response,
  ) {
    const exported = await this.productsService.exportAdminCsv(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    return response.send(exported.buffer);
  }

  @Get('csv/template')
  async exportAdminTemplateCsv(@Res() response: Response) {
    const exported = this.productsService.exportAdminTemplateCsv();
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    return response.send(exported.buffer);
  }

  @Post('csv/import')
  importAdminCsv(@Body() payload: ImportProductsCsvDto) {
    return this.productsService.importAdminCsv(payload.rows);
  }

  @Get('categories')
  listAdminCategories() {
    return this.productsService.listAdminCategories();
  }

  @Post('categories')
  createCategory(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productsService.createCategory(createProductCategoryDto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productsService.updateCategory(id, updateProductCategoryDto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.productsService.deactivateCategory(id);
  }

  @Get(':idOrSlug')
  findOneAdmin(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOneAdmin(idOrSlug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }
}
