import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromotionModule } from '../promotions/promotion.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [AuthModule, PromotionModule],
  providers: [CartService],
  controllers: [CartController],
})
export class CartModule {}
