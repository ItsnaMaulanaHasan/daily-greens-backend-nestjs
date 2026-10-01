import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';

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
}
