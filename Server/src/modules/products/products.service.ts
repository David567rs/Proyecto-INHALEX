import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ImportProductsCsvRowDto } from './dto/import-products-csv.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductDocument, Product } from './schemas/product.schema';
import {
  ProductCategoryDocument,
  ProductCategoryEntity,
} from './schemas/product-category.schema';
import { ProductStatus } from './enums/product-status.enum';
import { DEFAULT_PRODUCTS } from './data/default-products';
import { PRODUCT_CATEGORY_LABELS } from './constants/category-labels.constant';

export interface PaginatedProductsResponse {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SeedProductsResult {
  created: number;
  updated: number;
  total: number;
}

export interface PublicCategoryItem {
  id: string;
  name: string;
  count: number;
}

export interface AdminProductCategoryResponse {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductsCsvExport {
  fileName: string;
  buffer: Buffer;
}

export interface AdminProductsCsvImportError {
  row: number;
  idOrSlug: string;
  message: string;
}

export interface AdminProductsCsvImportResult {
  totalRows: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: AdminProductsCsvImportError[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductCategoryEntity.name)
    private readonly productCategoryModel: Model<ProductCategoryDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const slug = this.buildSlug(createProductDto.slug ?? createProductDto.name);
    await this.ensureUniqueSlug(slug);
    const categorySlug = this.buildSlug(createProductDto.category);
    await this.assertCategoryExists(categorySlug);

    const product = new this.productModel({
      ...createProductDto,
      slug,
      category: categorySlug,
      currency: (createProductDto.currency ?? 'MXN').toUpperCase(),
      benefits: this.normalizeStringArray(createProductDto.benefits),
      aromas: this.normalizeStringArray(createProductDto.aromas),
    });

    try {
      return await product.save();
    } catch (error: unknown) {
      this.handleDuplicateSlugError(error);
      throw error;
    }
  }

  async listPublic(
    query: ListProductsQueryDto,
  ): Promise<PaginatedProductsResponse> {
    return this.list(query, true);
  }

  async listAdmin(query: ListProductsQueryDto): Promise<PaginatedProductsResponse> {
    return this.list(query, false);
  }

  async exportAdminCsv(
    query: ListProductsQueryDto,
  ): Promise<AdminProductsCsvExport> {
    const filters = this.buildFilters(query, false);
    const products = await this.productModel
      .find(filters)
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();

    const rows = products.map((product) => this.mapProductToCsvRow(product));
    const csvRaw = this.buildCsv(
      [
        'id',
        'slug',
        'nombre',
        'categoria',
        'precio',
        'moneda',
        'presentacion',
        'presentation_ml',
        'estado',
        'disponible',
        'orden',
        'actualizado_en',
      ],
      rows,
    );

    return {
      fileName: `productos_${new Date().toISOString().slice(0, 10)}.csv`,
      buffer: Buffer.from(`\uFEFF${csvRaw}`, 'utf8'),
    };
  }

  exportAdminTemplateCsv(): AdminProductsCsvExport {
    const headers = [
      'id',
      'slug',
      'nombre',
      'categoria',
      'precio',
      'moneda',
      'presentacion',
      'presentation_ml',
      'estado',
      'disponible',
      'orden',
      'actualizado_en',
    ];

    const templateRows = [
      {
        id: 'ID_DEL_PRODUCTO',
        slug: 'toronjil',
        nombre: 'Toronjil',
        categoria: 'linea-insomnio',
        precio: '60',
        moneda: 'MXN',
        presentacion: '10ml',
        presentation_ml: '10',
        estado: 'active',
        disponible: 'true',
        orden: '1',
        actualizado_en: '',
      },
    ];

    const csvRaw = this.buildCsv(headers, templateRows);
    return {
      fileName: 'plantilla_productos.csv',
      buffer: Buffer.from(`\uFEFF${csvRaw}`, 'utf8'),
    };
  }

  async importAdminCsv(
    rows: ImportProductsCsvRowDto[],
  ): Promise<AdminProductsCsvImportResult> {
    if (!rows.length) {
      throw new BadRequestException('No hay filas para importar');
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: AdminProductsCsvImportError[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const id = row.id?.trim();
      const slug = row.slug?.trim().toLowerCase();
      const idOrSlug = id || slug || '(sin id)';

      if (!id && !slug) {
        skipped += 1;
        continue;
      }

      const product = await this.resolveProductByIdOrSlug(id, slug);
      if (!product) {
        failed += 1;
        errors.push({
          row: rowNumber,
          idOrSlug,
          message: 'Producto no encontrado',
        });
        continue;
      }

      try {
        const payload = this.buildUpdatePayloadFromCsvRow(row);
        if (Object.keys(payload).length === 0) {
          skipped += 1;
          continue;
        }

        await this.update(product.id, payload);
        updated += 1;
      } catch (error: unknown) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : 'No se pudo actualizar la fila';
        errors.push({
          row: rowNumber,
          idOrSlug,
          message,
        });
      }
    }

    return {
      totalRows: rows.length,
      updated,
      skipped,
      failed,
      errors: errors.slice(0, 100),
    };
  }

  async listAdminCategories(): Promise<AdminProductCategoryResponse[]> {
    await this.ensureDefaultCategories();

    const [categories, counts] = await Promise.all([
      this.productCategoryModel
        .find()
        .sort({ sortOrder: 1, createdAt: 1 })
        .exec(),
      this.productModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countByCategory = new Map(counts.map((item) => [item._id, item.count]));

    return categories.map((category) =>
      this.mapAdminCategory(category, countByCategory.get(category.slug) ?? 0),
    );
  }

  async createCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<AdminProductCategoryResponse> {
    const slug = this.buildSlug(
      createProductCategoryDto.slug ?? createProductCategoryDto.name,
    );

    const existing = await this.productCategoryModel
      .findOne({ slug })
      .select('_id')
      .exec();
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = new this.productCategoryModel({
      slug,
      name: createProductCategoryDto.name.trim(),
      description: createProductCategoryDto.description?.trim(),
      isActive: createProductCategoryDto.isActive ?? true,
      sortOrder: createProductCategoryDto.sortOrder ?? 9999,
    });

    try {
      const created = await category.save();
      return this.mapAdminCategory(created, 0);
    } catch (error: unknown) {
      this.handleDuplicateCategorySlugError(error);
      throw error;
    }
  }

  async updateCategory(
    categoryId: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ): Promise<AdminProductCategoryResponse> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category id');
    }

    if (
      updateProductCategoryDto.name === undefined &&
      updateProductCategoryDto.slug === undefined &&
      updateProductCategoryDto.description === undefined &&
      updateProductCategoryDto.isActive === undefined &&
      updateProductCategoryDto.sortOrder === undefined
    ) {
      throw new BadRequestException('At least one field must be updated');
    }

    const existingCategory = await this.productCategoryModel
      .findById(categoryId)
      .exec();
    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    const nextSlug = updateProductCategoryDto.slug
      ? this.buildSlug(updateProductCategoryDto.slug)
      : updateProductCategoryDto.name
        ? this.buildSlug(updateProductCategoryDto.name)
        : existingCategory.slug;

    if (nextSlug !== existingCategory.slug) {
      await this.ensureUniqueCategorySlug(nextSlug, existingCategory.id);
    }

    const updatePayload: UpdateProductCategoryDto & { slug: string } = {
      ...updateProductCategoryDto,
      slug: nextSlug,
    };

    if (updateProductCategoryDto.name !== undefined) {
      updatePayload.name = updateProductCategoryDto.name.trim();
    }

    if (updateProductCategoryDto.description !== undefined) {
      updatePayload.description = updateProductCategoryDto.description.trim();
    }

    const updatedCategory = await this.productCategoryModel
      .findByIdAndUpdate(categoryId, updatePayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException('Category not found');
    }

    if (existingCategory.slug !== updatedCategory.slug) {
      await this.productModel
        .updateMany(
          { category: existingCategory.slug },
          { $set: { category: updatedCategory.slug } },
        )
        .exec();
    }

    const productCount = await this.productModel
      .countDocuments({ category: updatedCategory.slug })
      .exec();

    return this.mapAdminCategory(updatedCategory, productCount);
  }

  async removeCategory(
    categoryId: string,
  ): Promise<{ deleted: boolean; categoryId: string }> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.productCategoryModel.findById(categoryId).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productsUsingCategory = await this.productModel
      .countDocuments({ category: category.slug })
      .exec();

    if (productsUsingCategory > 0) {
      throw new BadRequestException(
        'Cannot remove category with associated products',
      );
    }

    await this.productCategoryModel.findByIdAndDelete(categoryId).exec();
    return { deleted: true, categoryId };
  }

  async listPublicCategories(): Promise<PublicCategoryItem[]> {
    await this.ensureDefaultCategories();

    const counts = await this.productModel.aggregate<{ _id: string; count: number }>([
      { $match: { status: ProductStatus.ACTIVE } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countByCategory = new Map(counts.map((item) => [item._id, item.count]));

    const categories = await this.productCategoryModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .exec();

    return categories.map((category) => ({
      id: category.slug,
      name: category.name,
      count: countByCategory.get(category.slug) ?? 0,
    }));
  }

  async findOnePublic(idOrSlug: string): Promise<ProductDocument> {
    const product = await this.findOneByIdOrSlug(idOrSlug, true);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOneAdmin(idOrSlug: string): Promise<ProductDocument> {
    const product = await this.findOneByIdOrSlug(idOrSlug, false);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const existingProduct = await this.productModel.findById(productId).exec();
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const nextSlug = updateProductDto.slug
      ? this.buildSlug(updateProductDto.slug)
      : updateProductDto.name
        ? this.buildSlug(updateProductDto.name)
        : existingProduct.slug;

    if (nextSlug !== existingProduct.slug) {
      await this.ensureUniqueSlug(nextSlug, existingProduct.id);
    }

    const updatePayload: UpdateProductDto & { slug: string; currency?: string } = {
      ...updateProductDto,
      slug: nextSlug,
    };

    if (updateProductDto.currency) {
      updatePayload.currency = updateProductDto.currency.toUpperCase();
    }

    if (updateProductDto.benefits !== undefined) {
      updatePayload.benefits = this.normalizeStringArray(updateProductDto.benefits);
    }

    if (updateProductDto.aromas !== undefined) {
      updatePayload.aromas = this.normalizeStringArray(updateProductDto.aromas);
    }

    if (updateProductDto.category !== undefined) {
      const categorySlug = this.buildSlug(updateProductDto.category);
      await this.assertCategoryExists(categorySlug);
      updatePayload.category = categorySlug;
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(productId, updatePayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async seedDefaults(): Promise<SeedProductsResult> {
    await this.ensureDefaultCategories();

    let created = 0;
    let updated = 0;

    for (const seedProduct of DEFAULT_PRODUCTS) {
      const slug = this.buildSlug(seedProduct.name);
      const payload = {
        ...seedProduct,
        slug,
        category: this.buildSlug(seedProduct.category),
        currency: (seedProduct.currency ?? 'MXN').toUpperCase(),
        benefits: this.normalizeStringArray(seedProduct.benefits),
        aromas: this.normalizeStringArray(seedProduct.aromas),
      };

      const existing = await this.productModel.findOne({ slug }).select('_id').exec();

      if (!existing) {
        await this.productModel.create(payload);
        created += 1;
        continue;
      }

      await this.productModel
        .findByIdAndUpdate(existing.id, payload, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();

      updated += 1;
    }

    return {
      created,
      updated,
      total: DEFAULT_PRODUCTS.length,
    };
  }

  private async list(
    query: ListProductsQueryDto,
    onlyActive: boolean,
  ): Promise<PaginatedProductsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filters = this.buildFilters(query, onlyActive);

    const [items, total] = await Promise.all([
      this.productModel
        .find(filters)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filters).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private buildFilters(
    query: ListProductsQueryDto,
    onlyActive: boolean,
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    if (onlyActive) {
      filters.status = ProductStatus.ACTIVE;
    } else if (query.status) {
      filters.status = query.status;
    }

    if (query.category) {
      filters.category = query.category.toLowerCase().trim();
    }

    if (query.inStock !== undefined) {
      filters.inStock = query.inStock;
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filters.$or = [
        { name: regex },
        { description: regex },
        { longDescription: regex },
        { aromas: regex },
      ];
    }

    return filters;
  }

  private async findOneByIdOrSlug(
    idOrSlug: string,
    onlyActive: boolean,
  ): Promise<ProductDocument | null> {
    const baseFilter: Record<string, unknown> = onlyActive
      ? { status: ProductStatus.ACTIVE }
      : {};

    const query = Types.ObjectId.isValid(idOrSlug)
      ? { ...baseFilter, _id: idOrSlug }
      : { ...baseFilter, slug: idOrSlug.toLowerCase().trim() };

    return this.productModel.findOne(query).exec();
  }

  private async ensureDefaultCategories(): Promise<void> {
    for (const [index, category] of PRODUCT_CATEGORY_LABELS.entries()) {
      await this.productCategoryModel
        .updateOne(
          { slug: category.id },
          {
            $setOnInsert: {
              slug: category.id,
              name: category.name,
              isActive: true,
              sortOrder: index + 1,
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  private async assertCategoryExists(categorySlug: string): Promise<void> {
    const category = await this.productCategoryModel
      .findOne({ slug: categorySlug })
      .select('_id')
      .exec();

    if (!category) {
      throw new BadRequestException('Category does not exist');
    }
  }

  private async ensureUniqueCategorySlug(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.productCategoryModel
      .findOne({ slug })
      .select('_id')
      .exec();

    if (!existing) {
      return;
    }

    if (excludeId && existing.id === excludeId) {
      return;
    }

    throw new ConflictException('Category slug already exists');
  }

  private mapAdminCategory(
    category: ProductCategoryDocument,
    productCount: number,
  ): AdminProductCategoryResponse {
    return {
      _id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    };
  }

  private normalizeStringArray(values?: string[]): string[] {
    if (!values) {
      return [];
    }

    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private buildSlug(rawValue: string): string {
    const slug = rawValue
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug) {
      throw new BadRequestException('Invalid product slug');
    }

    return slug;
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.productModel.findOne({ slug }).select('_id').exec();

    if (!existing) {
      return;
    }

    if (excludeId && existing.id === excludeId) {
      return;
    }

    throw new ConflictException('Product slug already exists');
  }

  private handleDuplicateSlugError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      throw new ConflictException('Product slug already exists');
    }
  }

  private handleDuplicateCategorySlugError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      throw new ConflictException('Category slug already exists');
    }
  }

  private async resolveProductByIdOrSlug(
    id?: string,
    slug?: string,
  ): Promise<ProductDocument | null> {
    if (id && Types.ObjectId.isValid(id)) {
      const byId = await this.productModel.findById(id).exec();
      if (byId) return byId;
    }

    if (slug) {
      return this.productModel.findOne({ slug }).exec();
    }

    return null;
  }

  private buildUpdatePayloadFromCsvRow(row: ImportProductsCsvRowDto): UpdateProductDto {
    const payload: UpdateProductDto = {};

    if (row.nombre?.trim()) {
      payload.name = row.nombre.trim();
    }

    if (row.categoria?.trim()) {
      payload.category = row.categoria.trim();
    }

    if (row.moneda?.trim()) {
      payload.currency = row.moneda.trim().toUpperCase();
    }

    if (row.precio?.trim()) {
      payload.price = this.parseCsvPrice(row.precio);
    }

    const presentation = row.presentacion?.trim();
    const presentationMl = row.presentation_ml?.trim();
    if (presentation) {
      payload.presentation = presentation;
    } else if (presentationMl) {
      payload.presentation = `${this.parseCsvMl(presentationMl)}ml`;
    }

    if (row.estado?.trim()) {
      payload.status = this.parseCsvStatus(row.estado);
    }

    if (row.disponible?.trim()) {
      payload.inStock = this.parseCsvBoolean(row.disponible);
    }

    if (row.orden?.trim()) {
      payload.sortOrder = this.parseCsvSortOrder(row.orden);
    }

    return payload;
  }

  private parseCsvPrice(raw: string): number {
    const normalized = raw.trim().replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Precio invalido');
    }
    return value;
  }

  private parseCsvMl(raw: string): string {
    const normalized = raw.trim().replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('presentation_ml invalido');
    }
    return Number.isInteger(value) ? String(value) : String(value);
  }

  private parseCsvSortOrder(raw: string): number {
    const value = Number(raw.trim());
    if (!Number.isFinite(value) || value < 1) {
      throw new BadRequestException('Orden invalido');
    }
    return Math.floor(value);
  }

  private parseCsvStatus(raw: string): ProductStatus {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'activo') {
      return ProductStatus.ACTIVE;
    }
    if (normalized === 'draft' || normalized === 'borrador') {
      return ProductStatus.DRAFT;
    }
    if (normalized === 'archived' || normalized === 'archivado') {
      return ProductStatus.ARCHIVED;
    }
    throw new BadRequestException('Estado invalido');
  }

  private parseCsvBoolean(raw: string): boolean {
    const normalized = raw.trim().toLowerCase();
    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'si' ||
      normalized === 'sí' ||
      normalized === 'disponible'
    ) {
      return true;
    }
    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no' ||
      normalized === 'agotado'
    ) {
      return false;
    }
    throw new BadRequestException('Disponibilidad invalida');
  }

  private mapProductToCsvRow(product: ProductDocument): Record<string, string> {
    return {
      id: product.id,
      slug: product.slug,
      nombre: product.name,
      categoria: product.category,
      precio: String(product.price),
      moneda: product.currency,
      presentacion: product.presentation ?? '',
      presentation_ml: this.extractPresentationMl(product.presentation),
      estado: product.status,
      disponible: product.inStock ? 'true' : 'false',
      orden: String(product.sortOrder ?? ''),
      actualizado_en: product.updatedAt ? product.updatedAt.toISOString() : '',
    };
  }

  private extractPresentationMl(presentation?: string): string {
    if (!presentation) return '';
    const match = presentation.match(/(\d+(?:\.\d+)?)\s*ml/i);
    return match?.[1] ?? '';
  }

  private buildCsv(headers: string[], rows: Record<string, string>[]): string {
    const lines: string[] = [];
    lines.push(headers.map((header) => this.escapeCsv(header)).join(','));

    for (const row of rows) {
      const values = headers.map((header) => this.escapeCsv(row[header] ?? ''));
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  private escapeCsv(value: string): string {
    const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (
      normalized.includes(',') ||
      normalized.includes('"') ||
      normalized.includes('\n')
    ) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  }
}
