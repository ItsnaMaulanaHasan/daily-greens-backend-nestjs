import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'UUID varian produk yang dimasukkan ke cart',
    example: '',
    format: 'uuid',
  })
  @IsUUID(4)
  variantId: string;

  @ApiProperty({
    description: 'Jumlah produk yang dimasukkan',
    example: 2,
    minimum: 1,
    maximum: 99,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Catatan khusus untuk item pesanan',
    example: 'Tanpa gula dan es sedikit',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
