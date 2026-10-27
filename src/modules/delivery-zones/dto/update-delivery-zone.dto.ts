import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from 'src/modules/addresses/dto/create-address.dto';

export class UpdateDeliveryZoneDto extends PartialType(CreateAddressDto) {}
