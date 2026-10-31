import { Module } from '@nestjs/common';
import { StoreSettingsController } from './store-settings.controller';
import { StoreSettingsService } from './store-settings.service';

@Module({
  providers: [StoreSettingsService],
  controllers: [StoreSettingsController],
})
export class StoreSettingsModule {}
