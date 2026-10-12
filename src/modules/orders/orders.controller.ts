import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
}
