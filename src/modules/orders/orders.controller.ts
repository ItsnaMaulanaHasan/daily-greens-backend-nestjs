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
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
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
    summary: 'Mengubah status order',
    description:
      'Endpoint khusus admin untuk memproses status order sesuai alur yang diperbolehkan',
  })
  @ApiParam({
    name: 'ordeId',
    description: 'UUID order',
    format: 'uuid',
  })
  @ApiOkResponse({
    description:
      'Perpindahan tidak valid, catatan pembatalan tidak tersedia, atau status telah berubah',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Order tidak ditemukan',
  })
  @Patch('admin/:orderId/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateStatusOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(request.user.id, orderId, dto);
  }

  @ApiOperation({
    summary: 'Mengubah status pembayaran order',
    description:
      'Endpoint khusus admin untuk memperbarui status pembayaran dan menyinkronkan status pembayaran pada order',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID order',
    format: 'uuid',
  })
  @ApiParam({
    name: 'paymentId',
    description: 'UUID payment',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Status pembayaran berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description:
      'Perpindahan status pembayaran tidak valid, order dibatalkan, atau status pembayaran telah berubah',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Payment tidak ditemukan pada order tersebut',
  })
  @Patch('admin/:orderId/payments/:paymentId/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updatePaymentStatus(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(
      request.user.id,
      orderId,
      paymentId,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Mengambil seluruh daftar order',
    description:
      'Endpoint khusus admin dengan pencarian,filter status, tipe order, status pembayaran, tanggal, dan pagination',
  })
  @ApiOkResponse({
    description: 'Daftar order berhasil diambil',
  })
  @ApiBadRequestResponse({
    description: 'Rentang tanggal tidak valid atau query tidak sesuai',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getOrderForAdmin(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.getOrdersForAdmin(query);
  }

  @ApiOperation({
    summary: 'Mengambil detail order untuk admin',
    description:
      'Mengambil detail order customer beserta item, promosi, pembayaran, dan riwayat perubahan status',
  })
  @ApiParam({
    name: 'orderId',
    description: 'UUID order',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Detail order berhsil diambil',
  })
  @ApiForbiddenResponse({
    description: 'User sudah login tetapi bukan admin',
  })
  @ApiNotFoundResponse({
    description: 'Order tidak ditemukan',
  })
  @Get('admin/:orderId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getOrderByIdForAdmin(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.ordersService.getOrderByIdForAdmin(orderId);
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
