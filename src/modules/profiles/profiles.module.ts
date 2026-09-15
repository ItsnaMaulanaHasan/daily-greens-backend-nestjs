import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
