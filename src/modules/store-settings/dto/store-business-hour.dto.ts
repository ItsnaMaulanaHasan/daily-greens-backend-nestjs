import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { DayOfWeek } from 'generated/prisma/enums';

export class StoreBusinessHourDto {
  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    example: true,
    description: 'Bernilai true jika toko tutup sepanjang hari',
  })
  @IsBoolean()
  isClosed: boolean;

  @ApiPropertyOptional({
    example: '08:00',
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    description: 'Jam buka dalam format HH:mm. Wajib jika toko tidak tutup',
  })
  @ValidateIf((businessHour: StoreBusinessHourDto) => !businessHour.isClosed)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'openingTime must use the HH:mm format',
  })
  openingTime?: string;

  @ApiPropertyOptional({
    example: '21:00',
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
    description: 'Jam tutup dalam format HH:mm. Wajib jika toko tidak tutup',
  })
  @ValidateIf((businessHour: StoreBusinessHourDto) => !businessHour.isClosed)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'closingTime must use the HH:mm format',
  })
  closingTime?: string;
}
