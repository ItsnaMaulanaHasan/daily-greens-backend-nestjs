import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { PromotionService } from './promotion.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @ApiOperation({
    summary: 'Membuat promosi baru',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Promosi berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description:
      'Periode, aturan diskon, kode, atau target promosi tidak valid',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Salah satu target promosi tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Kode promosi sudah digunakan',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createPromotion(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotionService.createPromotion(request.user.id, dto);
  }

  @ApiOperation({
    summary: 'Mengambil daftar promosi',
    description: 'Endpoint admin dengan pencarian, filter, dan pagination',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Daftar promosi berhasil diambil',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllPromotions(@Query() query: PromotionQueryDto) {
    return this.promotionService.findAllPromotions(query);
  }

  @ApiOperation({
    summary: 'Memperbarui promosi',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID promosi',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Promosi berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description:
      'Periode, aturan diskon, kode, atau target promosi tidak valid',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Promosi atau salah satu target promosi tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Kode promosi sudah digunakan',
  })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePromotion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.promotionService.updatePromotion(id, dto);
  }

  @ApiOperation({
    summary: 'Menghapus promosi',
    description: 'Promosi dihapus secara soft delete',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID promosi',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Promosi berhasil dihapus',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Promosi tidak ditemukan atau sudah dihapus',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removePromotion(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.removePromotion(id);
  }

  @ApiOperation({
    summary: 'Mengambil promosi otomatis yang sedang aktif',
    description:
      'Endpoint publik dan tidak menampilkan kode promo bertipe kupon',
  })
  @ApiOkResponse({
    description: 'Daftar promosi otomatid aktif berhasil diambil',
  })
  @Get('active')
  findActiveAutomaticPromotions() {
    return this.promotionService.findActiveAutomaticPromotions();
  }

  @ApiOperation({
    summary: 'Mengambil detail promosi berdasarkan UUID',
  })
  @ApiOkResponse({
    description: 'Detail promosi berhasil diambil',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Promosi tidak ditemukan',
  })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findPromotionById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.findPromotionById(id);
  }
}
