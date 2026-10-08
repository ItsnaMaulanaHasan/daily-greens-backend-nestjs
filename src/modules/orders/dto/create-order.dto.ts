import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrderType, PaymentMethod } from 'generated/prisma/enums';

export class CreateOrderDto {
  @ApiProperty({
    enum: OrderType,
    example: OrderType.DELIVERY,
    description: 'Jenis pemenuhan pesanan',
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description: 'Untuk tahap awal hanya metode CASH yang dapat digunakan',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: 'Itsna Maulana',
    minLength: 2,
    maxLength: 255,
    description: 'Nama penerima atau pemesan',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  customerName: string;

  @ApiProperty({
    example: '081234567890',
    description: 'Nomor telepon penerima',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^\+?\d{8,15}$/, {
    message:
      'customerPhone must contain 8 to 15 digits and may start with a plus sign',
  })
  customerPhone: string;

  @ApiPropertyOptional({
    example: 'JL. Merdeka No. 10, Jakarta',
    maxLength: 2000,
    description:
      'Wajib untuk DELIVERY dan tidak diperlukan untuk PICKUP atau DINE_IN',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    example: 'Tolong hubungi ketika pesanan sudah sampai',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;
}
