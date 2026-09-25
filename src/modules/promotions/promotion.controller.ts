import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}
}
