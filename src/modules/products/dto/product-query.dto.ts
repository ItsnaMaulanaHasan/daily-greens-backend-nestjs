import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional({
    example: 'Kopi',
    description: 'Mencari produk berdasarkan nama',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    example: 'minuman',
    description: 'Filter berdasarkan slug kategori',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter produk unggulan',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return false;
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
