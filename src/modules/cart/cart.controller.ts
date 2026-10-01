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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

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

  @ApiOperation({
    summary: 'Memperbarui jumlah atau catatan item',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID CartItem',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Cart item berhasil diperbarui',
  })
  @ApiBadRequestResponse({
    description:
      'Data update kosong, produk tidak tersedia, atau stok tidak mencukupi',
  })
  @ApiNotFoundResponse({
    description: 'Cart item tidak ditemukan',
  })
  @Patch('items/:itemId')
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request.user.id, itemId, dto);
  }

  @ApiOperation({
    summary: 'Menghapus satu item dari cart',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID CartItem',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Cart item berhasil dihapus',
  })
  @ApiNotFoundResponse({
    description: 'Cart item tidak ditemukan',
  })
  @Delete('items/:itemId')
  removeItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.cartService.removeItem(request.user.id, itemId);
  }

  @ApiOperation({
    summary: 'Menghapus seluruh item dari cart',
  })
  @ApiOkResponse({
    description: 'Cart berhasil dikosongkan',
  })
  @Delete('items')
  clearMyCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.clearMyCart(request.user.id);
  }
}
