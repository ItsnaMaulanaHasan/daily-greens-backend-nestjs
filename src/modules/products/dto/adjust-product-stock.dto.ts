import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';
import { StockMovementType } from 'generated/prisma/enums';

const allowedManualStockMovementTypes = [
  StockMovementType.RESTOCK,
  StockMovementType.RETURN,
  StockMovementType.ADJUSTMENT,
  StockMovementType.CANCELLATION,
] as const;

export class AdjustProductStockDto {
  @ApiProperty({
    enum: allowedManualStockMovementTypes,
    example: StockMovementType.RESTOCK,
    description: 'Jenis perubahan stock',
  })
  @IsEnum(StockMovementType)
  @IsIn(allowedManualStockMovementTypes)
  type: StockMovementType;

  @ApiProperty({
    example: 10,
    description:
      'Jumlah perubahan stok, nilai positif menambah dan nilai negatif mengurangi stok',
  })
  @IsInt()
  @NotEquals(0)
  quantityChange: number;

  @ApiPropertyOptional({
    example: 'Penambahan stock dari supplier',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
