import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeliveryZone(dto: CreateDeliveryZoneDto) {
    this.validateDeliveryRules({
      minimumOrderAmount: dto.minimumOrderAmount ?? 0,
      freeDeliveryThreshold: dto.freeDeliveryThreshold ?? null,
      estimatedMaxMinutes: dto.estimatedMaxMinutes,
      estimatedMinMinutes: dto.estimatedMinMinutes,
    });

    const normalizePostalCode = [
      ...new Set(dto.postalCode.map((postalCode) => postalCode.trim())),
    ];

    try {
      const deliveryZone = await this.prisma.$transaction(
        async (transaction) => {
          const existingName = await transaction.deliveryZone.findFirst({
            where: {
              name: {
                equals: dto.name.trim(),
                mode: 'insensitive',
              },
            },
            select: {
              id: true,
            },
          });

          if (!existingName) {
            throw new ConflictException('Delivery zone name is already in use');
          }

          const usedPostalCodes =
            await transaction.deliveryZonePostalCode.findMany({
              where: {
                postalCode: {
                  in: normalizePostalCode,
                },
              },
              select: {
                postalCode: true,
                zone: {
                  select: {
                    name: true,
                  },
                },
              },
            });

          if (usedPostalCodes.length > 0) {
            const conflicts = usedPostalCodes
              .map(
                (postalCode) =>
                  `${postalCode.postalCode} (${postalCode.zone.name})`,
              )
              .join(', ');

            throw new ConflictException(
              `Postal codes are already used: ${conflicts}`,
            );
          }

          return transaction.deliveryZone.create({
            data: {
              name: dto.name.trim(),
              description: dto.description?.trim() || null,
              deliveryFee: dto.deliveryFee,
              minimumOrderAmount: dto.minimumOrderAmount ?? 0,
              freeDeliveryThreshold: dto.freeDeliveryThreshold ?? null,
              estimatedMinMinutes: dto.estimatedMinMinutes,
              estimatedMaxMinutes: dto.estimatedMaxMinutes,
              isActive: dto.isActive ?? true,

              postalCodes: {
                create: normalizePostalCode.map((postalCode) => ({
                  postalCode,
                })),
              },
            },
            include: {
              postalCodes: {
                select: {
                  id: true,
                  postalCode: true,
                },
                orderBy: {
                  postalCode: 'asc',
                },
              },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return {
        ...deliveryZone,
        deliveryFee: Number(deliveryZone.deliveryFee),
        minimumOrderAmount: Number(deliveryZone.minimumOrderAmount),
        freeDeliveryThreshold:
          deliveryZone.freeDeliveryThreshold === null
            ? null
            : Number(deliveryZone.freeDeliveryThreshold),
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'One or more postal codes are already useed',
        );
      }

      throw error;
    }
  }

  private validateDeliveryRules(rules: {
    minimumOrderAmount: number;
    freeDeliveryThreshold: number | null;
    estimatedMinMinutes: number;
    estimatedMaxMinutes: number;
  }): void {
    if (rules.estimatedMaxMinutes < rules.estimatedMinMinutes) {
      throw new BadRequestException(
        'estimatedMaxMinutes cannot be less than estimatedMinMinutes',
      );
    }

    if (
      rules.freeDeliveryThreshold !== null &&
      rules.freeDeliveryThreshold < rules.minimumOrderAmount
    ) {
      throw new BadRequestException(
        'freeDeliveryThreshold cannot be less than minimumOrderAmount',
      );
    }
  }
}
