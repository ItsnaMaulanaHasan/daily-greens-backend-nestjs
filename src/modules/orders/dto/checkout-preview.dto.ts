import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderType } from 'generated/prisma/enums';

export class CheckoutPreviewDto {
  @ApiProperty({
    enum: OrderType,
    example: OrderType.DELIVERY,
    description: 'Jenis pemenuhan pesanan',
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiPropertyOptional({
    example: '',
    format: 'uuid',
    description:
      'ID alamat tersimpan. Wajib untuk DELIVERY dan itdak digunakan untuk PICKUP atau DINE_IN',
  })
  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;
}
