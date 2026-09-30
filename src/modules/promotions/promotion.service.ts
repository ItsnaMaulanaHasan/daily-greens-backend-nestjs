import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  DiscountType,
  PromotionApplicationType,
  PromotionScope,
} from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async createPromotion(createdBy: string, dto: CreatePromotionDto) {
    const applicationType =
      dto.applicationType ?? PromotionApplicationType.AUTOMATIC;
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    this.validatePromotionDates(startsAt, endsAt);
    this.validatePromotionApplication(applicationType, dto.code);
    this.validatePromotionDiscount(dto);
    this.validatePromotionUsage(dto);

    const categoryIds = dto.categoryIds ?? [];
    const productIds = dto.productIds ?? [];
    const variantIds = dto.variantIds ?? [];

    this.validatePromotionTargets(
      dto.scope,
      categoryIds,
      productIds,
      variantIds,
    );

    await this.ensurePromotionTargetsExist(
      dto.scope,
      categoryIds,
      productIds,
      variantIds,
    );

    try {
      return await this.prisma.promotion.create({
        data: {
          name: dto.name,
          description: dto.description,
          applicationType,
          code: dto.code,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maximumDiscount: dto.maximumDiscount,
          minimumOrderAmount: dto.minimumOrderAmount,
          minimumQuantity: dto.minimumQuantity,
          scope: dto.scope,
          startsAt,
          endsAt,
          usageLimit: dto.usageLimit,
          usageLimitPerUser: dto.usageLimitPerUser,
          priority: dto.priority,
          isStackable: dto.isStackable,
          isActive: dto.isActive,
          createdBy,
          categoryTargets:
            categoryIds.length > 0
              ? {
                  create: categoryIds.map((categoryId) => ({
                    categoryId,
                  })),
                }
              : undefined,
          productTargets:
            productIds.length > 0
              ? {
                  create: productIds.map((productId) => ({
                    productId,
                  })),
                }
              : undefined,
          variantTargets:
            variantIds.length > 0
              ? {
                  create: variantIds.map((variantId) => ({
                    variantId,
                  })),
                }
              : undefined,
        },
        include: {
          categoryTargets: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          productTargets: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          variantTargets: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Promotion code is already in use');
      }

      throw error;
    }
  }

  private validatePromotionDates(startsAt: Date, endsAt: Date): void {
    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Promotion end date must be later than start date',
      );
    }
  }

  private validatePromotionApplication(
    applicationType: PromotionApplicationType,
    code?: string,
  ): void {
    if (applicationType === PromotionApplicationType.COUPON && !code) {
      throw new BadRequestException(
        'Promotion code is required for coupon promotion',
      );
    }

    if (applicationType === PromotionApplicationType.AUTOMATIC && code) {
      throw new BadRequestException(
        'Automatic promotion cannot have a coupon code',
      );
    }
  }

  private validatePromotionDiscount(dto: CreatePromotionDto): void {
    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (
      dto.discountType === DiscountType.FIXED_AMOUNT &&
      dto.maximumDiscount !== undefined
    ) {
      throw new BadRequestException(
        'Maximum discount is only available for percentage discount',
      );
    }
  }

  private validatePromotionUsage(dto: CreatePromotionDto): void {
    if (
      dto.usageLimit !== undefined &&
      dto.usageLimitPerUser !== undefined &&
      dto.usageLimitPerUser > dto.usageLimit
    ) {
      throw new BadRequestException(
        'Usage limit per user cannot exceed total usage limit',
      );
    }
  }

  private validatePromotionTargets(
    scope: PromotionScope,
    categoryIds: string[],
    productIds: string[],
    variantIds: string[],
  ): void {
    const hasCategories = categoryIds.length > 0;
    const hasProducts = productIds.length > 0;
    const hasVariants = variantIds.length > 0;

    if (
      scope === PromotionScope.ALL_PRODUCTS &&
      (hasCategories || hasProducts || hasVariants)
    ) {
      throw new BadRequestException(
        'ALL_PRODUCTS promotion cannot have specific targets',
      );
    }

    if (
      scope === PromotionScope.CATEGORY &&
      (!hasCategories || hasProducts || hasVariants)
    ) {
      throw new BadRequestException(
        'CATEGORY promotion requires only categoryIds',
      );
    }

    if (
      scope === PromotionScope.PRODUCT &&
      (!hasProducts || hasCategories || hasVariants)
    ) {
      throw new BadRequestException(
        'PRODUCT promotion requires only productIds',
      );
    }

    if (
      scope === PromotionScope.VARIANT &&
      (!hasVariants || hasCategories || hasProducts)
    ) {
      throw new BadRequestException(
        'VARIANT promotion requires only variantIds',
      );
    }
  }

  private async ensurePromotionTargetsExist(
    scope: PromotionScope,
    categoryIds: string[],
    productIds: string[],
    variantIds: string[],
  ): Promise<void> {
    if (scope === PromotionScope.CATEGORY) {
      const categoryCount = await this.prisma.productCategory.count({
        where: {
          id: {
            in: categoryIds,
          },
          deletedAt: null,
        },
      });

      if (categoryCount !== categoryIds.length) {
        throw new NotFoundException(
          'One or more promotion categories were not found',
        );
      }
    }

    if (scope === PromotionScope.PRODUCT) {
      const productCount = await this.prisma.product.count({
        where: {
          id: {
            in: productIds,
          },
          deletedAt: null,
        },
      });

      if (productCount !== productIds.length) {
        throw new NotFoundException(
          'One or more promotion products were not found',
        );
      }
    }

    if (scope === PromotionScope.VARIANT) {
      const variantCount = await this.prisma.productVariant.count({
        where: {
          id: {
            in: variantIds,
          },
          deletedAt: null,
          product: {
            is: {
              deletedAt: null,
            },
          },
        },
      });

      if (variantCount !== variantIds.length) {
        throw new NotFoundException(
          'One or more promotion variants were not found',
        );
      }
    }
  }

  async findAllPromotions(query: PromotionQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.PromotionWhereInput = {
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
                code: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.applicationType
        ? {
            applicationType: query.applicationType,
          }
        : {}),
      ...(query.scope
        ? {
            scope: query.scope,
          }
        : {}),
      ...(query.isActive !== undefined
        ? {
            isActive: query.isActive,
          }
        : {}),
    };

    const [promotions, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          categoryTargets: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          productTargets: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          variantTargets: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.promotion.count({
        where,
      }),
    ]);

    return {
      data: promotions,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        categoryTargets: {
          select: {
            categoryId: true,
          },
        },
        productTargets: {
          select: {
            productId: true,
          },
        },
        variantTargets: {
          select: {
            variantId: true,
          },
        },
      },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const applicationType = dto.applicationType ?? promotion.applicationType;

    const discountType = dto.discountType ?? promotion.discountType;

    const discountValue =
      dto.discountValue ?? promotion.discountValue.toNumber();

    const scope = dto.scope ?? promotion.scope;

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : promotion.startsAt;

    const endsAt = dto.endsAt ? new Date(dto.endsAt) : promotion.endsAt;

    const code =
      applicationType === PromotionApplicationType.COUPON
        ? (dto.code ?? promotion.code)
        : null;

    const maximumDiscount =
      discountType === DiscountType.FIXED_AMOUNT
        ? null
        : (dto.maximumDiscount ??
          promotion.maximumDiscount?.toNumber() ??
          null);

    const usageLimit = dto.usageLimit ?? promotion.usageLimit;

    const usageLimitPerUser =
      dto.usageLimitPerUser ?? promotion.usageLimitPerUser;

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Promotion end date must be later than start date',
      );
    }

    if (applicationType === PromotionApplicationType.COUPON && !code) {
      throw new BadRequestException(
        'Promotion code is required for coupon promotion',
      );
    }

    if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (
      usageLimit !== null &&
      usageLimitPerUser !== null &&
      usageLimitPerUser > usageLimit
    ) {
      throw new BadRequestException(
        'Usage limit per user cannot exceed total usage limit',
      );
    }

    const categoryIds =
      dto.categoryIds ??
      (scope === promotion.scope
        ? promotion.categoryTargets.map((target) => target.categoryId)
        : []);

    const productIds =
      dto.productIds ??
      (scope === promotion.scope
        ? promotion.productTargets.map((target) => target.productId)
        : []);

    const variantIds =
      dto.variantIds ??
      (scope === promotion.scope
        ? promotion.variantTargets.map((target) => target.variantId)
        : []);

    this.validatePromotionTargets(scope, categoryIds, productIds, variantIds);

    await this.ensurePromotionTargetsExist(
      scope,
      categoryIds,
      productIds,
      variantIds,
    );

    try {
      return await this.prisma.promotion.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          name: dto.name,
          description: dto.description,
          applicationType,
          code,
          discountType,
          discountValue,
          maximumDiscount,
          minimumOrderAmount: dto.minimumOrderAmount,
          minimumQuantity: dto.minimumQuantity,
          scope,
          startsAt,
          endsAt,
          usageLimit,
          usageLimitPerUser,
          priority: dto.priority,
          isStackable: dto.isStackable,
          isActive: dto.isActive,
          categoryTargets: {
            deleteMany: {},
            create: categoryIds.map((categoryId) => ({ categoryId })),
          },
          productTargets: {
            deleteMany: {},
            create: productIds.map((productId) => ({ productId })),
          },
          variantTargets: {
            deleteMany: {},
            create: variantIds.map((variantId) => ({ variantId })),
          },
        },
        include: {
          categoryTargets: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          productTargets: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          variantTargets: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Promotion code is already in use');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Promotion not found');
      }

      throw error;
    }
  }

  async removePromotion(id: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return this.prisma.promotion.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
