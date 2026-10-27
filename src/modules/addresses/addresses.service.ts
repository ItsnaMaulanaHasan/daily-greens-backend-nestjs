import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async getMyAddresses(userId: string) {
    const addresses = await this.prisma.userAddress.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    const postalCode = [
      ...new Set(addresses.map((address) => address.postalCode)),
    ];

    const deliveryMapping =
      postalCode.length > 0
        ? await this.prisma.deliveryZonePostalCode.findMany({
            where: {
              postalCode: {
                in: postalCode,
              },
              zone: {
                is: {
                  isActive: true,
                  deletedAt: null,
                },
              },
            },
            select: {
              postalCode: true,
              zone: {
                select: {
                  id: true,
                  name: true,
                  deliveryFee: true,
                  minimumOrderAmount: true,
                  freeDeliveryThreshold: true,
                  estimatedMinMinutes: true,
                  extimatedMaxMinutes: true,
                },
              },
            },
          })
        : [];

    const deliveryZoneByPostalCode = new Map(
      deliveryMapping.map((mapping) => [mapping.postalCode, mapping.zone]),
    );

    return {
      data: addresses.map((address) => {
        const deliveryZone = deliveryZoneByPostalCode.get(address.postalCode);

        return {
          ...address,
          latitude: address.latitude === null ? null : Number(address.latitude),
          longitude:
            address.longitude === null ? null : Number(address.longitude),
          delivery: deliveryZone
            ? {
                isAvailable: true,
                zone: {
                  ...deliveryZone,
                  deliveryFee: Number(deliveryZone.deliveryFee),
                  minimumOrderAmount: Number(deliveryZone.minimumOrderAmount),
                  freeDeliveryThreshold:
                    deliveryZone.freeDeliveryThreshold === null
                      ? null
                      : Number(deliveryZone.freeDeliveryThreshold),
                },
              }
            : {
                isAvailable: false,
                zone: null,
              },
        };
      }),
    };
  }

  async getMyAddressesById(userId: string, addressId: string) {
    const address = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
        deletedAt: null,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const deliveryMapping = await this.prisma.deliveryZonePostalCode.findFirst({
      where: {
        postalCode: address.postalCode,
        zone: {
          is: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        zone: {
          select: {
            id: true,
            name: true,
            deliveryFee: true,
            minimumOrderAmount: true,
            freeDeliveryThreshold: true,
            estimatedMinMinutes: true,
            extimatedMaxMinutes: true,
          },
        },
      },
    });

    const deliveryZone = deliveryMapping?.zone ?? null;

    return {
      ...address,
      latitude: address.latitude === null ? null : Number(address.latitude),
      longitude: address.longitude === null ? null : Number(address.longitude),

      delivery:
        deliveryZone !== null
          ? {
              isAvailable: true,
              zone: {
                ...deliveryZone,
                deliveryFee: Number(deliveryZone.deliveryFee),
                minimumOrderAmount: Number(deliveryZone.minimumOrderAmount),
                freeDeliveryThreshold:
                  deliveryZone.freeDeliveryThreshold === null
                    ? null
                    : Number(deliveryZone.freeDeliveryThreshold),
              },
            }
          : {
              isAvailable: false,
              zone: null,
            },
    };
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
