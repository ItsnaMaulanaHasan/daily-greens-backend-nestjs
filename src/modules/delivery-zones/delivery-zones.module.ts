import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryZonesController } from './delivery-zones.controller';
import { DeliveryZonesService } from './delivery-zones.service';

@Module({
  imports: [AuthModule],
  controllers: [DeliveryZonesController],
  providers: [DeliveryZonesService],
})
export class DeliveryZonesModule {}
