import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { DeliveryZoneQueryDto } from './dto/delivery-zone-query.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

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

    const normalizePostalCodess = [
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

          if (existingName) {
            throw new ConflictException('Delivery zone name is already in use');
          }

          const usedPostalCodes =
            await transaction.deliveryZonePostalCode.findMany({
              where: {
                postalCode: {
                  in: normalizePostalCodess,
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
                create: normalizePostalCodess.map((postalCode) => ({
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

  async findAllDeliveryZones(query: DeliveryZoneQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.DeliveryZoneWhereInput = {
      deletedAt: null,

      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),

      ...(query.isActive !== undefined
        ? {
            isActive: query.isActive,
          }
        : {}),
    };

    const [deliveryZones, total] = await this.prisma.$transaction([
      this.prisma.deliveryZone.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          createdAt: 'desc',
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
      }),

      this.prisma.deliveryZone.count({
        where,
      }),
    ]);

    return {
      data: deliveryZones.map((deliveryZones) => ({
        ...deliveryZones,
        deliveryFee: Number(deliveryZones.deliveryFee),
        minimumOrderAmount: Number(deliveryZones.minimumOrderAmount),
        freeDeliveryThreshold:
          deliveryZones.freeDeliveryThreshold === null
            ? null
            : Number(deliveryZones.freeDeliveryThreshold),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findDeliveryZoneById(id: string) {
    const deliveryZone = await this.prisma.deliveryZone.findFirst({
      where: {
        id,
        deletedAt: null,
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

    if (!deliveryZone) {
      throw new NotFoundException('Delivery zone not found');
    }

    return {
      ...deliveryZone,
      deliveryFee: Number(deliveryZone.deliveryFee),
      minimumOrderAmount: Number(deliveryZone.minimumOrderAmount),
      freeDeliveryThreshold:
        deliveryZone.freeDeliveryThreshold === null
          ? null
          : Number(deliveryZone.freeDeliveryThreshold),
    };
  }

  async updateDeliveryZone(id: string, dto: UpdateDeliveryZoneDto) {
    const normalizePostalCodes =
      dto.postalCode !== undefined
        ? [...new Set(dto.postalCode.map((potalCode) => potalCode.trim()))]
        : undefined;

    try {
      const deliveryZone = await this.prisma.$transaction(
        async (transaction) => {
          const existingDeliveryZone = await transaction.deliveryZone.findFirst(
            {
              where: {
                id,
                deletedAt: null,
              },
            },
          );

          if (!existingDeliveryZone) {
            throw new NotFoundException('Delivery zone not found');
          }

          const minimumOrderAmount =
            dto.minimumOrderAmount ??
            Number(existingDeliveryZone.minimumOrderAmount);

          const freeDeliveryThreshold =
            dto.freeDeliveryThreshold ??
            (existingDeliveryZone.freeDeliveryThreshold === null
              ? null
              : Number(existingDeliveryZone.freeDeliveryThreshold));

          const estimatedMinMinutes =
            dto.estimatedMinMinutes ?? existingDeliveryZone.estimatedMinMinutes;

          const estimatedMaxMinutes =
            dto.estimatedMaxMinutes ?? existingDeliveryZone.estimatedMaxMinutes;

          this.validateDeliveryRules({
            minimumOrderAmount,
            freeDeliveryThreshold,
            estimatedMinMinutes,
            estimatedMaxMinutes,
          });

          if (dto.name !== undefined) {
            const duplicateName = await transaction.deliveryZone.findFirst({
              where: {
                id: {
                  not: id,
                },
                deletedAt: null,
                name: {
                  equals: dto.name.trim(),
                  mode: 'insensitive',
                },
              },
              select: {
                id: true,
              },
            });

            if (duplicateName) {
              throw new ConflictException(
                'Delivery zone name is already in use',
              );
            }
          }

          if (normalizePostalCodes !== undefined) {
            const usedPostalCodes =
              await transaction.deliveryZonePostalCode.findMany({
                where: {
                  postalCode: {
                    in: normalizePostalCodes,
                  },
                  zoneId: {
                    not: id,
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
          }

          return transaction.deliveryZone.update({
            where: {
              id,
            },
            data: {
              ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),

              ...(dto.description !== undefined
                ? { description: dto.description.trim() || null }
                : {}),

              ...(dto.deliveryFee !== undefined
                ? { deliveryFee: dto.deliveryFee }
                : {}),

              ...(dto.minimumOrderAmount !== undefined
                ? { minimumOrderAmount: dto.minimumOrderAmount }
                : {}),

              ...(dto.freeDeliveryThreshold !== undefined
                ? { freeDeliveryThreshold: dto.freeDeliveryThreshold }
                : {}),

              ...(dto.estimatedMinMinutes !== undefined
                ? { estimatedMinMinutes: dto.estimatedMinMinutes }
                : {}),

              ...(dto.estimatedMaxMinutes !== undefined
                ? { estimatedMaxMinutes: dto.estimatedMaxMinutes }
                : {}),

              ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),

              ...(normalizePostalCodes !== undefined
                ? {
                    postalCodes: {
                      deleteMany: {},
                      create: normalizePostalCodes.map((postalCode) => ({
                        postalCode,
                      })),
                    },
                  }
                : {}),
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
        error.code === 'P202'
      ) {
        throw new ConflictException(
          'One or more postal codes are already used',
        );
      }

      throw error;
    }
  }

  async deleteDeliveryZone(id: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        const deliveryZone = await transaction.deliveryZone.findFirst({
          where: {
            id,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!deliveryZone) {
          throw new NotFoundException('Delivery zone not found');
        }

        await transaction.deliveryZone.update({
          where: {
            id,
          },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });

        await transaction.deliveryZonePostalCode.deleteMany({
          where: {
            zoneId: id,
          },
        });

        return {
          message: 'Delivery zone deleted successfully',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async checkDeliveryAvailability(postalCode: string) {
    const deliveryMapping = await this.prisma.deliveryZonePostalCode.findFirst({
      where: {
        postalCode,
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
            description: true,
            deliveryFee: true,
            minimumOrderAmount: true,
            freeDeliveryThreshold: true,
            estimatedMinMinutes: true,
            estimatedMaxMinutes: true,
          },
        },
      },
    });

    if (!deliveryMapping) {
      return {
        postalCode,
        isAvailable: false,
        deliveryZone: null,
      };
    }

    const deliveryZone = deliveryMapping.zone;

    return {
      postalCode,
      isAvailable: true,
      deliveryZone: {
        ...deliveryZone,
        deliveryFee: Number(deliveryZone.deliveryFee),
        minimumOrderAmount: Number(deliveryZone.minimumOrderAmount),
        freeDeliveryThreshold:
          deliveryZone.freeDeliveryThreshold === null
            ? null
            : Number(deliveryZone.freeDeliveryThreshold),
      },
    };
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
