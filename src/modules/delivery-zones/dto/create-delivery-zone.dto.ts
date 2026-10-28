import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({
    example: 'Jakarta Pusat',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Zona pengiriman untuk wilayah Jakarta Pusat',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: 10000,
    minimum: 0,
    description: 'Biaya pengiriman',
  })
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  deliveryFee: number;

  @ApiPropertyOptional({
    example: 50000,
    default: 0,
    minimum: 0,
    description: 'Minimum subtotal agar order dapat dikirim ke zona ini',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({
    example: 150000,
    minimum: 0,
    nullable: true,
    description: 'Subtotal minimum untuk gratis ongkir',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  freeDeliveryThreshold?: number;

  @ApiProperty({
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMinMinutes: number;

  @ApiProperty({
    example: 60,
    minimum: 1,
    maximum: 1440,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMaxMinutes: number;

  @ApiProperty({
    example: ['10110', '10120', '10350'],
    minItems: 1,
    maxItems: 100,
    description: 'Daftar kode pos yang termasuk dalam zona',
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((postalCode: unknown) =>
          typeof postalCode === 'string' ? postalCode.trim() : postalCode,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @Matches(/^\d{5}$/, {
    each: true,
    message: 'Each postal code must contain exactly 5 digits',
  })
  postalCode: string[];

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
