import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductOptionValueDto {
  @ApiProperty({
    example: 'hot',
    maxLength: 100,
    description: 'Nilai internal yang digunakan aplikasi',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'value hanya boleh berisi huruf kecil, angka, dan tanda hubung',
  })
  value: string;

  @ApiProperty({
    example: 'Panas',
    maxLength: 100,
    description: 'Teks yang ditampilkan kepada customer',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductOptionDto {
  @ApiProperty({
    example: 'temperature',
    maxLength: 100,
    description: 'Nama internal opsi',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'name hanya boleh berisi huruf kecil, angka, dan tanda hubung',
  })
  name: string;

  @ApiProperty({
    example: 'Suhu',
    maxLength: 100,
    description: 'Nama opsi yang ditampilkan kepada customer',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiProperty({
    type: [CreateProductOptionValueDto],
    description: 'Daftar nilai yang tersedia untuk opsi',
    example: [
      {
        value: 'hot',
        label: 'Panas',
        position: 1,
      },
      {
        value: 'cold',
        label: 'Dingin',
        position: 2,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateProductOptionValueDto)
  values: CreateProductOptionValueDto[];
}
