import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserGender } from '../../../../generated/prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Nama lengkap user',
    example: 'Itsna Maulana',
    minLength: 2,
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Alamat user',
    example: 'Jl. Merdeka No. 10, Jakarta',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional({
    description: 'Nomor telepon, terdiri dari 8 sampai 15 digit',
    example: '089875676338',
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'phoneNumber must contain 8 to 15 digits and may start with a plus sign',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Tanggal lahir dalam format YYYY-MM-DD',
    example: '1995-08-17',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @ApiPropertyOptional({
    description: 'Jenis kelamin user',
    enum: UserGender,
    enumName: 'UserGender',
    example: UserGender.MALE,
  })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;
}
