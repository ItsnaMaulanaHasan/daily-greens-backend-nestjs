import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({
    description: 'Jumlah terbaru item di dalam cart',
    example: 3,
    minimum: 1,
    maximum: 99,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @ApiPropertyOptional({
    description:
      'Catatan terbaru. Kirim null untuk menghapus catatan sebelumnya',
    example: 'Tanpa gula',
    maxLength: 1000,
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}
