import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
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

export class CreateProductVariantDto {
  @ApiProperty({
    example: 'KOPI-SUSU-COLD-LARGE',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, {
    message: 'sku hanya boleh berisi huruf kapital, angka, dan tanda hubung',
  })
  sku: string;

  @ApiProperty({
    example: 'Dingin - Besar',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 28000,
    minimum: 0,
    description: 'Harga jual varian',
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 18000,
    minimum: 0,
    description: 'Harga modal; tidak ditampilkan kepada customer',
  })
  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    example: 20,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Apakah stok varian perlu dilacak',
  })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Apakah varian ini menjadi pilihan default produk',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

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
    description: 'Daftar UUID nilai opsi yang membentuk kombinasi varian',
    example: [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', {
    each: true,
  })
  optionValueIds?: string[];
}
