import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [AuthModule, CloudinaryModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
