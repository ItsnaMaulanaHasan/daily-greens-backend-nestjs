import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ProductService } from './product.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface UploadedProductImageFile {
  buffer: Buffer;
}

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
    summary: 'Mengambil katalog produk yang aktif',
    description:
      'Endpoint publik dengan pencarian, filter kategori, produk unggulan, dan pagination',
  })
  @ApiOkResponse({
    description: 'Katalog produk berhasil diambil',
  })
  @Get()
  findAllPublicProducts(@Query() query: ProductQueryDto) {
    return this.productService.findAllPublicProducts(query);
  }

  @ApiOperation({
    summary: 'Mengambil detail produk berdasarkan slug',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug produk',
    example: 'es-kopi-susu',
  })
  @ApiOkResponse({
    description: 'Detail produk berhasil diambil',
  })
  @ApiNotFoundResponse({
    description: 'Produk tidak ditemukan atau tidak aktif',
  })
  @Get(':slug')
  findPublicProductBySlug(@Param('slug') slug: string) {
    return this.productService.findPublicProductBySlug(slug);
  }

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

  @ApiOperation({
    summary: 'Memperbarui data produk',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID produk',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Produk berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description:
      'Produk tidak dapat diaktifkan karena belum memiliki varian aktif',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login, tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Produk atau kategori produk tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Slug produk sudah digunakan',
  })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateProduct(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @ApiOperation({
    summary: 'Menghapus produk',
    description:
      'Produk dihapus secara soft delete dan statusnya diubah menjadi ARCHIVED',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID produk',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Produk berhasil dihapus',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login, tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Produk tidak ditemukan atau sudah dihapus',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeProduct(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productService.removeProduct(id);
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

  // variant produk
  @ApiOperation({
    summary: 'Membuat varian produk',
    description: 'Varian menyimpan kombinasi opsi, harga, stok, dan SKU produk',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'productId',
    description: 'UUID produk',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Varian produk berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description:
      'Nilai opsi tidak valid, tidak lengkap, atau terdapat lebih dari satu nilai dari opsi yang sama',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login, tapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Produk tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'SKU atau kombinasi opsi varian sudah digunakan',
  })
  @Post(':productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createProductVariant(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productService.createProductVariant(
      productId,
      request.user.id,
      dto,
    );
  }

  // product image
  @ApiOperation({
    summary: 'Mengunggah gambar produk',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'productId',
    description: 'UUID produk',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'File JPG, PNG, atau WebP dengan ukuran maksimal 5 MB',
        },
        altText: {
          type: 'string',
          example: 'Es Kopi Susu Gula Aren',
        },
        position: {
          type: 'interger',
          minimum: 0,
          example: 1,
        },
        isPrimary: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Gambar produk berhasil diunggah',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedai, tidak valid, atau kadaluwara',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Produk tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Produk sudah memiliki lima gambar aktif',
  })
  @ApiUnprocessableEntityResponse({
    description: 'File tidak tersedia atau format file tidak didukung',
  })
  @ApiPayloadTooLargeResponse({
    description: 'Ukuran file melebihi 5 MB',
  })
  @ApiBadGatewayResponse({
    description: 'Gagal mengunggah gambar ke Cloudinary',
  })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @Post('productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  uploadProductImage(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedProductImageFile,
    @Body() dto: UploadProductImageDto,
  ) {
    return this.productService.uploadProductImage(productId, file, dto);
  }
}
