import {
  Body,
  Controller,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
}
