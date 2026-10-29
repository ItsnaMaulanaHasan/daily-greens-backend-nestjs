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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { DeliveryZoneQueryDto } from './dto/delivery-zone-query.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly deliveryZonesService: DeliveryZonesService) {}

  @ApiOperation({
    summary: 'Membuat delivery zone baru',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Delivery zone berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description: 'Aturan biaya atau estimasi pengiriman tidak valid',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: ' User sudah login tetapi bukan admin',
  })
  @ApiConflictResponse({
    description: 'Nama zona atau salah satu kode pos sudah digunakan',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createDeliveryZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.createDeliveryZone(dto);
  }

  @ApiOperation({
    summary: 'Mengambil daftar delivery zone',
    description:
      'Endpoint admin dengan pencarian, filter status, dan pagination',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Daftar delivery zone berhasil diambil',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllDeliveryZones(@Query() query: DeliveryZoneQueryDto) {
    return this.deliveryZonesService.findAllDeliveryZones(query);
  }

  @ApiOperation({
    summary: 'Mengambil detail delivery zone',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID delivery zone',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Detail delivery zone berhasil diambil',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User udah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Delovery zone tidak ditemukan',
  })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findDeliveryZoneById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.deliveryZonesService.findDeliveryZoneById(id);
  }

  @ApiOperation({
    summary: 'Memperbarui delivery zone',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID delivery zone',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Delivery zone berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description: 'Aturan biaya atau estimasi pengiriman tidak valid',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Delivery zone tidak ditemukan',
  })
  @ApiConflictResponse({
    description: 'Nama zona atau salah satu kode pos sudah digunakan',
  })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateDeliveryZone(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
  ) {
    return this.deliveryZonesService.updateDeliveryZone(id, dto);
  }

  @ApiOperation({
    summary: 'Menghapus delivery zone',
    description:
      'Delivery zone dihapus secara soft delete dan kode posnya dilepaskan',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    description: 'UUID delivery zone',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Delivery zone berhasil dihapus',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Delivery zone tidak ditemukan atau sudah dihapus',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteDelliveryZone(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.deliveryZonesService.deleteDeliveryZone(id);
  }
}
