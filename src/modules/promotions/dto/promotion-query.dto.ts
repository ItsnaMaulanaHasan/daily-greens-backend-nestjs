import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PromotionApplicationType,
  PromotionScope,
} from 'generated/prisma/enums';

export class PromotionQueryDto {
  @ApiPropertyOptional({
    example: 'diskon',
    description: 'Mencari promosi berdasarkan nama atau kode',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    enum: PromotionApplicationType,
    example: PromotionApplicationType.COUPON,
  })
  @IsOptional()
  @IsEnum(PromotionApplicationType)
  applicationType?: PromotionApplicationType;

  @ApiPropertyOptional({
    enum: PromotionScope,
    example: PromotionScope.PRODUCT,
  })
  @IsOptional()
  @IsEnum(PromotionScope)
  scope?: PromotionScope;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter berdasarkan status aktif',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

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
