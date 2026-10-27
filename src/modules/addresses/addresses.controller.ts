import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description:
    'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
})
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @ApiOperation({
    summary: 'Membuat alamat customer',
  })
  @ApiCreatedResponse({
    description: 'Alamat berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description:
      'Data alamat tidak valid, koordinat tidak lengkap, atau batas jumlah alamat tercapai',
  })
  @Post()
  createAddress(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.createAddress(request.user.id, dto);
  }

  @ApiOperation({
    summary: 'Mengambil seluruh alamat milik customer',
  })
  @ApiOkResponse({
    description: 'Daftar alamat dan ketersediaan pengiriman berhasil diambil',
  })
  @Get()
  getMyAddresses(@Req() request: AuthenticatedRequest) {
    return this.addressesService.getMyAddresses(request.user.id);
  }

  @ApiOperation({
    summary: 'Mengambil detail alamat customer',
  })
  @ApiParam({
    name: 'addressId',
    description: 'UUID alamat',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Detail alamat berhasil diambil',
  })
  @ApiNotFoundResponse({
    description:
      'Alamat tidak ditemukan atau bukan milik user yang sedang login',
  })
  @Get(':addressId')
  getMyAddressById(
    @Req() request: AuthenticatedRequest,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
  ) {
    return this.addressesService.getMyAddressesById(request.user.id, addressId);
  }

  @ApiOperation({
    summary: 'Memperbarui alamat customer',
  })
  @ApiParam({
    name: 'addressId',
    description: 'UUID alamat',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Alamat berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description:
      'Body kosong, koordinat tidak lengkap, atau alamat tunggal kehilangan status default',
  })
  @ApiNotFoundResponse({
    description:
      'Alamat tidak ditemukan atau bukan milik user yang sedang login',
  })
  @Patch(':addressId')
  updateMyAddress(
    @Req() request: AuthenticatedRequest,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateMyAddress(
      request.user.id,
      addressId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Menghapus alamat customer',
    description:
      'Alamat dihapus secara soft delete. Jika alamat tersebut default, alamat aktif lainnya akan dijadikan default',
  })
  @ApiParam({
    name: 'addressId',
    description: 'UUID alamat',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Alamat berhasil dihapus',
  })
  @ApiNotFoundResponse({
    description:
      'Alamat tidak ditemukan atau bukan milik user yang sedang login',
  })
  @Delete(':addressId')
  removeMyAddress(
    @Req() request: AuthenticatedRequest,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
  ) {
    return this.addressesService.removeMyAddress(request.user.id, addressId);
  }
}
