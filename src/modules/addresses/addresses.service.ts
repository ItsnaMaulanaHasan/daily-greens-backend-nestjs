import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

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
            province: dto.province.trim(),
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

  async updateMyAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    this.validateCoordinate(dto.latitude, dto.longitude);

    await this.prisma.$transaction(
      async (transaction) => {
        const currentAddress = await transaction.userAddress.findFirst({
          where: {
            id: addressId,
            userId,
            deletedAt: null,
          },
          select: {
            id: true,
            isDefault: true,
          },
        });

        if (!currentAddress) {
          throw new NotFoundException('Address not found');
        }

        if (dto.isDefault === true) {
          await transaction.userAddress.updateMany({
            where: {
              userId,
              id: {
                not: addressId,
              },
              isDefault: true,
              deletedAt: null,
            },
            data: {
              isDefault: false,
            },
          });
        }

        if (dto.isDefault === false && currentAddress.isDefault) {
          const replacementAddress = await transaction.userAddress.findFirst({
            where: {
              userId,
              id: {
                not: addressId,
              },
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
            },
          });

          if (!replacementAddress) {
            throw new BadRequestException(
              'The only active address must remain the default address',
            );
          }

          await transaction.userAddress.update({
            where: {
              id: replacementAddress.id,
            },
            data: {
              isDefault: true,
            },
          });
        }

        await transaction.userAddress.update({
          where: {
            id: addressId,
          },
          data: {
            ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
            ...(dto.recipientName !== undefined
              ? { recipientName: dto.recipientName.trim() }
              : {}),
            ...(dto.recipientPhone !== undefined
              ? { recipientPhone: dto.recipientPhone.trim() }
              : {}),
            ...(dto.addressLine !== undefined
              ? { addressLine: dto.addressLine.trim() }
              : {}),
            ...(dto.province !== undefined
              ? { province: dto.province.trim() }
              : {}),
            ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
            ...(dto.district !== undefined
              ? { district: dto.district.trim() }
              : {}),
            ...(dto.village !== undefined
              ? { village: dto.village.trim() }
              : {}),
            ...(dto.postalCode !== undefined
              ? { postalCode: dto.postalCode.trim() }
              : {}),
            ...(dto.latitude !== undefined && dto.longitude !== undefined
              ? {
                  latitude: dto.latitude,
                  longitude: dto.longitude,
                }
              : {}),
            ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
            ...(dto.isDefault !== undefined
              ? { isDefault: dto.isDefault }
              : {}),
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
