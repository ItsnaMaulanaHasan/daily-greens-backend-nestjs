import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async createAddress(userId: string, dto: CreateAddressDto) {
    this.validateCoordinate(dto.latitude, dto.longitude);

    return this.prisma.$transaction(
      async (transaction) => {
        const addressCount = await transaction.userAddress.count({
          where: {
            userId,
            deletedAt: null,
          },
        });

        if (addressCount >= 10) {
          throw new BadRequestException(
            'A user can have a maximum 0f 10 addresses',
          );
        }

        const shouldBeDefault = dto.isDefault === true || addressCount === 0;

        if (shouldBeDefault) {
          await transaction.userAddress.updateMany({
            where: {
              userId,
              isDefault: true,
              deletedAt: null,
            },
            data: {
              isDefault: false,
            },
          });
        }

        return transaction.userAddress.create({
          data: {
            userId,
            label: dto.label.trim(),
            recipientName: dto.recipientName.trim(),
            recipientPhone: dto.recipientPhone.trim(),
            addressLine: dto.addressLine.trim(),
            province: dto.provience.trim(),
            city: dto.city.trim(),
            district: dto.district.trim(),
            village: dto.village?.trim(),
            postalCode: dto.postalCode.trim(),
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            note: dto.note?.trim() || null,
            isDefault: shouldBeDefault,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private validateCoordinate(latitude?: number, longitude?: number): void {
    const hasLatitude = latitude != undefined;
    const hasLongitude = longitude != undefined;

    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }
  }
}
