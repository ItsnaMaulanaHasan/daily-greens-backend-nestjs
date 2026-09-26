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

@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async createPromotion(createdBy: string, dto: CreatePromotionDto) {
    const applicationType =
      dto.applicationType ?? PromotionApplicationType.AUTOMATIC;

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Promotion end date must be later than start date',
      );
    }

    if (applicationType === PromotionApplicationType.COUPON && !dto.code) {
      throw new BadRequestException(
        'Promotion code is required for coupon promotion',
      );
    }

    if (applicationType === PromotionApplicationType.AUTOMATIC && dto.code) {
      throw new BadRequestException(
        'Automatic promotion cannot have a coupon code',
      );
    }

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

    if (
      dto.usageLimit !== undefined &&
      dto.usageLimitPerUser !== undefined &&
      dto.usageLimitPerUser > dto.usageLimit
    ) {
      throw new BadRequestException(
        'Usage limit per user cannot exceed total usage limit',
      );
    }

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
      return this.prisma.promotion.create({
        data: {
          name: dto.name,
          description: dto.description,
          applicationType,
          code: dto.code,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maximumDiscount: dto.maximumDiscount,
          minimumOrderAmount: dto.minimumOrderAmount,
          minimumQuantity: dto.minimumOrderAmount,
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
        'CATEGORY promotion requires only cateforyIds',
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
        },
      });

      if (variantCount !== variantIds.length) {
        throw new NotFoundException(
          'One or more promotion variants were not found',
        );
      }
    }
  }
}
