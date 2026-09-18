import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
}
