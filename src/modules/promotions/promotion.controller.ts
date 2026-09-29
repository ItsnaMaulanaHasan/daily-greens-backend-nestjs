import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
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
}
