import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UploadProductImageDto {
  @ApiPropertyOptional({
    example: 'Es Kopi Susu Gula Aren',
    maxLength: 255,
    description: 'Teks alternatif untuk aksesbilitas gambar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
    description: 'Urutan tampilan gambar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Menentukan apakah gambar menjadi gambar utama produk',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isPrimary?: boolean;
}
