import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DiscountType,
  PromotionApplicationType,
  PromotionScope,
} from 'generated/prisma/enums';

export class CreatePromotionDto {
  @ApiProperty({
    example: 'Diskon Akhir Pekan',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Diskon khusus pembelian pada akhir pekan',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: PromotionApplicationType,
    example: PromotionApplicationType.AUTOMATIC,
    default: PromotionApplicationType.AUTOMATIC,
  })
  @IsOptional()
  @IsEnum(PromotionApplicationType)
  applicationType?: PromotionApplicationType;

  @ApiPropertyOptional({
    example: 'WEEKEND20',
    maxLength: 100,
    description: 'Wajib diisi jika applicationType adalah COUPON',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, {
    message: 'code hanya boleh berisi huruf kapital, angka, dan tanda hubung',
  })
  code?: string;

  @ApiProperty({
    example: 20,
    minimum: 0.01,
    description: 'Persentase diskon atau nominal diskon sesuai discountType',
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  discountValue: number;

  @ApiProperty({
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    example: 25000,
    minimum: 0,
    description: 'Batas maksimum potongan untuk diskon persentase',
  })
  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  maximumDiscount?: number;

  @ApiPropertyOptional({
    example: 100000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({
    enum: PromotionScope,
    example: PromotionScope.CATEGORY,
  })
  @IsEnum(PromotionScope)
  scope: PromotionScope;

  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString()
  startsAt: string;

  @ApiProperty({
    example: '2026-10-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'UUID kategori untuk scope CATEGORY',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', {
    each: true,
  })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'UUID produk untuk scope PRODUCT',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', {
    each: true,
  })
  productIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'UUID varian untuk scope VARIANT',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', {
    each: true,
  })
  variantIds?: string[];
}
