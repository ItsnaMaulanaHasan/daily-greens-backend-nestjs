import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from 'generated/prisma/enums';

export class CreateProductDto {
  @ApiProperty({
    description: 'UUID kategori produk',
    format: 'uuid',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    example: 'Es Kopi Susu',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'es-kopi-susu',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 'Kopi susu dengan gula aren',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
    default: ProductStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Menentukan apakah customer boleh menambahkan catatan',
  })
  @IsOptional()
  @IsBoolean()
  allowCustomerNote?: boolean;

  @ApiPropertyOptional({
    example: 'Contoh: gulanya sedikit',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notePlaceholder?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    description: 'Estimasi waktu persiapan dalam menit',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  preparationTimeMinutes?: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
