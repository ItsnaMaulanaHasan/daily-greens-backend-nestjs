import {
  Body,
  Controller,
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
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description:
    'Access token tidak tersedia, tidak valid, atau sudah kedaluwarsa',
})
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Mengambil daftar order milik user',
    description:
      'Mengambil riwayat order milik user yang sedang login dengan filter dan pagination.',
  })
  @ApiOkResponse({
    description: 'Daftar order berhasil diambil',
  })
  @Get()
  getMyOrders(
    @Req() request: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.getMyOrders(request.user.id, query);
  }

  @ApiOperation({
    summary: 'Mengambil detail order milik user',
    description:
      'Mengambil detail order beserta item, pilihan produk, promosi, pembayaran, dan riwayat status',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID order',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Detail order berhasil diambil',
  })
  @ApiNotFoundResponse({
    description:
      'Order tidak ditemukan atau bukan milik user yang sedang login',
  })
  @Get(':orderId')
  getMyOrderById(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.ordersService.getMyOrderById(request.user.id, orderId);
  }

  @ApiOperation({
    summary: 'Membatalkan order milik user',
    description:
      'Customer hanya dapat membatalkan order yang masih berstatus PENDING. Stok produk akan dikembalikan secara otomatis',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID order yang akan dibatalkan',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Order berhasil dibatalkan',
  })
  @ApiBadRequestResponse({
    description:
      'Order tidak lagi berstatus PENDING atau status order telah berubah',
  })
  @ApiNotFoundResponse({
    description:
      'Order tidak ditemukan atau bukan milik user yang sedang login',
  })
  @Patch(':orderId/cancel')
  cancelMyOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelMyOrder(request.user.id, orderId, dto);
  }

  @ApiOperation({
    summary: 'Membuat order dari cart user',
    description:
      'Memvalidasi cart, menghitung ulang promo, membuat order, mengurangi stok, dan mengosongkan cart',
  })
  @ApiCreatedResponse({
    description: 'Order berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description:
      'Cart kosong, produk tidak tersedia, stok tidak mencukupi, promo tidak valid, atau data checkout tidak sesuai',
  })
  @Post('checkout')
  checkout(@Req() request: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(request.user.id, dto);
  }
}
