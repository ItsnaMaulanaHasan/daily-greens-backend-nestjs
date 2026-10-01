import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ApplyCartCouponDto {
  @ApiProperty({
    description: 'Kode coupon yang akan diterapkan pada cart',
    example: 'WEEKEND20',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, {
    message: 'code hanya boleh berisi huruf kapital, angka, dan tanda hubung',
  })
  code: string;
}
