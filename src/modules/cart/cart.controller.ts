import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
})
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: 'Mengambil cart milik user yang sedang login',
  })
  @ApiOkResponse({
    description: 'Cart berhasil diambil',
  })
  @Get()
  getMyCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.getMyCart(request.user.id);
  }

  @ApiOperation({
    summary: 'Menambahkan item ke cart',
  })
  @ApiCreatedResponse({
    description: 'Item berhasil ditambahkan ke cart',
  })
  @ApiBadRequestResponse({
    description:
      'Produk tidak tersedia, stok tidak cukup, atau catatan tidak diizinkan',
  })
  @ApiNotFoundResponse({
    description: 'Variant produk tidak ditemukan',
  })
  @Post('items')
  addItem(@Req() request: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(request.user.id, dto);
  }
}
