import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    example: 'Saya salah memilih alamat pengiriman',
    minLength: 5,
    maxLength: 500,
    description: 'Alasan customer membatalkan order',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
