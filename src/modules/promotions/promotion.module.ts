import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromotionCalculationService } from './promotion-calculator.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

@Module({
  imports: [AuthModule],
  controllers: [PromotionController],
  providers: [PromotionService, PromotionCalculationService],
})
export class PromotionModule {}
