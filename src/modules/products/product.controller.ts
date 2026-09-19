import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductService } from './product.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // product category
  @ApiOperation({
    summary: 'Mengambil daftar kategori produk yang aktif',
  })
  @ApiOkResponse({
    description: 'Daftar kategori produk aktif berhasil diambil',
  })
  @Get('categories')
  findAllActiveCategories() {
    return this.productService.findAllActiveCategories();
  }

  @ApiOperation({
    summary: 'Membuat kategori produk',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Kategori produk berhasil dibuat',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiConflictResponse({
    description: 'Nama atau slug kategori sudah digunakan',
  })
  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createCategory(@Body() dto: CreateProductCategoryDto) {
    return this.productService.createCategory(dto);
  }

  @ApiOperation({
    summary: 'Mengubah kategori produk',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID kategori produk',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Kategori produk berhasil diperbarui',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Kategori produk tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Nama atau slug kategori sudah digunakan',
  })
  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productService.updateCategory(id, dto);
  }

  @ApiOperation({
    summary: 'Menghapus kategori produk',
    description:
      'Kategori dihapus secara soft delete dan tidak boleh masih memiliki produk',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID kategori produk',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Kategori produk berhasil dihapus',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Kategori produk tidak ditemukan atau sudah dihapus',
  })
  @ApiConflictResponse({
    description: 'Kategori masih memiliki produk',
  })
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeCategory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productService.removeCategory(id);
  }

  // product
  @ApiOperation({
    summary: 'Membuat produk baru',
    description:
      'Produk dibuat tanpa varian dan menggunakan status DRAFT secara default',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Produk berhasil dibuat',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Kategori produk tidak ditemukan atau tidak aktif',
  })
  @ApiConflictResponse({
    description: 'Slug produk sudah digunakan',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  // product option
  @ApiOperation({
    summary: 'Membuat opsi beserta nilai opsi untuk produk',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'productId',
    description: 'UUID produk',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Opsi produk dan nilai opsinya berhasil dibuat',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Produk tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Nama opsi atau nilai opsi sudah digunakan pada produk ini',
  })
  @Post(':productId/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createProductOption(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: CreateProductOptionDto,
  ) {
    return this.productService.createProductOption(productId, dto);
  }
}
