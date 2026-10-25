import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Rumah',
    maxLength: 50,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @ApiProperty({
    example: 'Itsna Maulana',
    minLength: 2,
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  recipientName: string;

  @ApiProperty({
    example: '081234567890',
    description: 'Nomor telepen penerima, terdiri dari 8 sampai 15 digit',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^\+?\d{8,15}$/, {
    message:
      'recipientPhone must contain 8 to 15 digits and may start with a plus sign',
  })
  recipientPhone: string;

  @ApiProperty({
    example: 'JL. Merdeka No. 10, RT 01/RW 02',
    minLength: 5,
    maxLength: 2000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  addressLine: string;

  @ApiProperty({
    example: 'DKI Jakarta',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provience: string;

  @ApiProperty({
    example: 'Jakarta Pusat',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    example: 'Menteng',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @ApiPropertyOptional({
    example: 'Gondangdia',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  village?: string;

  @ApiProperty({
    example: '10305',
    description: 'Kode Pos Indonesia sebanhay 5 digit',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^\d{5}$/, {
    message: 'postalCode must contain exactly 5 digits',
  })
  postalCode: string;

  @ApiPropertyOptional({
    example: -6.1944491,
    minimum: 1,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 7,
  })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 106.8229198,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 7,
  })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    example: 'Rumah pagar hitam di sebelah minimarket',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Menjadikan alamat sebagai alamat utama',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
