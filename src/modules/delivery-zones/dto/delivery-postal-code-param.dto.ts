import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class DeliveryPostalCodeParamDto {
  @ApiProperty({
    example: '10110',
    description: 'Kode pos tujuan pengiriman, tepat lima digit',
  })
  @IsString()
  @Matches(/^\d{5}$/, {
    message: 'postalCode must contain exactly 5 digits',
  })
  postalCode: string;
}
