import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description:
    'Access token tidak tersedia, tidak valid, atau sudah kadaluwarsa',
})
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @ApiOperation({
    summary: 'Membuat order dari cart user',
    description:
      'Memvalidasi cart, menghitung ulang promo, membuat order, mengurangi stok, dan mengosongkan cart',
  })
  @ApiCreatedResponse({
    description: 'Ordeer berhasil dibuat',
  })
  @ApiBadRequestResponse({
    description:
      'Cart kosong, produk tidak tersedia, stock tidak mencukupi, promo tidak valid, atau data checkout tidak sesuai',
  })
  @Post('checkout')
  checkout(@Req() request: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.orderService.checkout(request.user.id, dto);
  }
}
