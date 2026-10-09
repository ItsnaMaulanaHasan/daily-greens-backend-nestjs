import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  DiscountType,
  OrderType,
  PaymentMethod,
  ProductStatus,
  PromotionApplicationType,
  PromotionScope,
} from 'generated/prisma/enums';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PromotionCalculationItem,
  PromotionCalculationService,
} from '../promotions/promotion-calculator.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface AppliedCheckoutPromotion {
  id: string;
  name: string;
  code: string | null;
  applicationType: PromotionApplicationType;
  discountType: DiscountType;
  discountValue: number;
  scope: PromotionScope;
  priority: number;
  isStackable: boolean;
  eligibleSubtotal: number;
  discountAmount: number;
}

interface CheckoutPricing {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  appliedPromotions: AppliedCheckoutPromotion[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionCalculator: PromotionCalculationService,
  ) {}

  private async getValidatedCheckoutCart(
    transaction: Prisma.TransactionClient,
    userId: string,
  ) {
    const cart = await transaction.cart.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        couponPromotion: {
          select: {
            id: true,
            name: true,
            code: true,
            applicationType: true,
            discountType: true,
            discountValue: true,
            maximumDiscount: true,
            minimumOrderAmount: true,
            minimumQuantity: true,
            scope: true,
            startsAt: true,
            endsAt: true,
            priority: true,
            isStackable: true,
            isActive: true,
            deletedAt: true,
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
        },
        items: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            variantId: true,
            quantity: true,
            note: true,
            variant: {
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                stock: true,
                trackStock: true,
                isActive: true,
                deletedAt: true,
                product: {
                  select: {
                    id: true,
                    categoryId: true,
                    name: true,
                    status: true,
                    deletedAt: true,
                    allowCustomerNote: true,
                  },
                },
                optionValues: {
                  select: {
                    optionValue: {
                      select: {
                        label: true,
                        option: {
                          select: {
                            displayName: true,
                            position: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const quantityByVariant = cart.items.reduce((quantities, item) => {
      const currentQuantity = quantities.get(item.variantId) ?? 0;

      quantities.set(item.variantId, currentQuantity + item.quantity);

      return quantities;
    }, new Map<string, number>());

    for (const item of cart.items) {
      const product = item.variant.product;

      if (
        product.status !== ProductStatus.ACTIVE ||
        product.deletedAt !== null
      ) {
        throw new BadRequestException(
          `Product "${product.name}" is unavailable`,
        );
      }

      if (!item.variant.isActive || item.variant.deletedAt !== null) {
        throw new BadRequestException(
          `Product variant "${item.variant.name}" is unavailable`,
        );
      }

      if (item.note && !product.allowCustomerNote) {
        throw new BadRequestException(
          `Customer note is no longer allowed for product "${product.name}"`,
        );
      }

      const totalVariantQuantity = quantityByVariant.get(item.variantId) ?? 0;

      if (
        item.variant.trackStock &&
        totalVariantQuantity > item.variant.stock
      ) {
        throw new BadRequestException(
          `Insufficient stock for variant "${item.variant.name}". Available stock: ${item.variant.stock}`,
        );
      }
    }

    return cart;
  }

  private async calculateCheckoutPricing(
    transaction: Prisma.TransactionClient,
    cart: Awaited<ReturnType<OrdersService['getValidatedCheckoutCart']>>,
  ): Promise<CheckoutPricing> {
    const promotionItems: PromotionCalculationItem[] = cart.items.map(
      (item) => ({
        categoryId: item.variant.product.categoryId,
        productId: item.variant.product.id,
        variantId: item.variant.id,
        quantity: item.quantity,
        lineTotal: Number(item.variant.price) * item.quantity,
        isAvailable: true,
      }),
    );

    const subtotal = promotionItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    );

    const couponCalculatiion = cart.couponPromotion
      ? this.promotionCalculator.calculate(
          {
            discountType: cart.couponPromotion.discountType,
            discountValue: Number(cart.couponPromotion.discountValue),
            maximumDiscount:
              cart.couponPromotion.maximumDiscount === null
                ? null
                : Number(cart.couponPromotion.maximumDiscount),
            minimumOrderAmount:
              cart.couponPromotion.minimumOrderAmount === null
                ? null
                : Number(cart.couponPromotion.minimumOrderAmount),
            minimumQuantity: cart.couponPromotion.minimumQuantity,
            scope: cart.couponPromotion.scope,
            startsAt: cart.couponPromotion.startsAt,
            endsAt: cart.couponPromotion.endsAt,
            isActive: cart.couponPromotion.isActive,
            deletedAt: cart.couponPromotion.deletedAt,
            categoryIds: cart.couponPromotion.categoryTargets.map(
              (target) => target.categoryId,
            ),
            productIds: cart.couponPromotion.productTargets.map(
              (target) => target.productId,
            ),
            variantIds: cart.couponPromotion.variantTargets.map(
              (target) => target.variantId,
            ),
          },
          promotionItems,
        )
      : null;

    if (cart.couponPromotion && couponCalculatiion?.isEligible !== true) {
      throw new BadRequestException(
        `Applied coupon is no longer valid: ${
          couponCalculatiion?.ineligibleReason ?? 'unknown reason'
        }`,
      );
    }

    const now = new Date();

    const automaticPromotions = await transaction.promotion.findMany({
      where: {
        applicationType: PromotionApplicationType.AUTOMATIC,
        isActive: true,
        deletedAt: null,
        startsAt: {
          lte: now,
        },
        endsAt: {
          gte: now,
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        applicationType: true,
        discountType: true,
        discountValue: true,
        maximumDiscount: true,
        minimumOrderAmount: true,
        minimumQuantity: true,
        scope: true,
        startsAt: true,
        endsAt: true,
        priority: true,
        isStackable: true,
        isActive: true,
        deletedAt: true,
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
      orderBy: [
        {
          priority: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    const eligibleAutomaticPromotions = automaticPromotions
      .map((promotion) => {
        const calculation = this.promotionCalculator.calculate(
          {
            discountType: promotion.discountType,
            discountValue: Number(promotion.discountValue),
            maximumDiscount:
              promotion.maximumDiscount === null
                ? null
                : Number(promotion.maximumDiscount),
            minimumOrderAmount:
              promotion.minimumOrderAmount === null
                ? null
                : Number(promotion.minimumOrderAmount),
            minimumQuantity: promotion.minimumQuantity,
            scope: promotion.scope,
            startsAt: promotion.startsAt,
            endsAt: promotion.endsAt,
            isActive: promotion.isActive,
            deletedAt: promotion.deletedAt,
            categoryIds: promotion.categoryTargets.map(
              (target) => target.categoryId,
            ),
            productIds: promotion.productTargets.map(
              (target) => target.productId,
            ),
            variantIds: promotion.variantTargets.map(
              (target) => target.variantId,
            ),
          },
          promotionItems,
        );

        return {
          id: promotion.id,
          name: promotion.name,
          code: promotion.code,
          applicationType: promotion.applicationType,
          discountType: promotion.discountType,
          discountValue: Number(promotion.discountValue),
          scope: promotion.scope,
          priority: promotion.priority,
          isStackable: promotion.isStackable,
          isEligible: calculation.isEligible,
          eligibleSubtotal: calculation.eligibleSubtotal,
          discountAmount: calculation.discountAmount,
        };
      })
      .filter((promotion) => promotion.isEligible);

    let selectedAutomaticPromotions: typeof eligibleAutomaticPromotions = [];

    if (cart.couponPromotion && couponCalculatiion?.isEligible === true) {
      if (cart.couponPromotion.isStackable) {
        selectedAutomaticPromotions = eligibleAutomaticPromotions.filter(
          (promotion) => promotion.isStackable,
        );
      }
    } else if (eligibleAutomaticPromotions.length > 0) {
      const [primaryPromotion, ...otherPromotions] =
        eligibleAutomaticPromotions;

      selectedAutomaticPromotions = [primaryPromotion];

      if (primaryPromotion.isStackable) {
        selectedAutomaticPromotions.push(
          ...otherPromotions.filter((promotion) => promotion.isStackable),
        );
      }
    }

    const selectedPromotions: Array<
      Omit<AppliedCheckoutPromotion, 'discountAmount'> & {
        calculatedDiscountAmount: number;
      }
    > = [];

    if (cart.couponPromotion && couponCalculatiion?.isEligible === true) {
      selectedPromotions.push({
        id: cart.couponPromotion.id,
        name: cart.couponPromotion.name,
        code: cart.couponPromotion.code,
        applicationType: cart.couponPromotion.applicationType,
        discountType: cart.couponPromotion.discountType,
        discountValue: Number(cart.couponPromotion.discountValue),
        scope: cart.couponPromotion.scope,
        priority: cart.couponPromotion.priority,
        isStackable: cart.couponPromotion.isStackable,
        eligibleSubtotal: couponCalculatiion.eligibleSubtotal,
        calculatedDiscountAmount: couponCalculatiion.discountAmount,
      });
    }

    selectedPromotions.push(
      ...selectedAutomaticPromotions.map((promotion) => ({
        id: promotion.id,
        name: promotion.name,
        code: promotion.code,
        applicationType: promotion.applicationType,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        scope: promotion.scope,
        priority: promotion.priority,
        isStackable: promotion.isStackable,
        eligibleSubtotal: promotion.eligibleSubtotal,
        calculatedDiscountAmount: promotion.discountAmount,
      })),
    );

    let accumulatedDiscount = 0;

    const appliedPromotions: AppliedCheckoutPromotion[] = [];

    for (const promotion of selectedPromotions) {
      const remainingAmount = Math.max(0, subtotal - accumulatedDiscount);

      const discountAmount = Math.min(
        promotion.calculatedDiscountAmount,
        remainingAmount,
      );

      if (discountAmount <= 0) {
        continue;
      }

      accumulatedDiscount += discountAmount;

      appliedPromotions.push({
        id: promotion.id,
        name: promotion.name,
        code: promotion.code,
        applicationType: promotion.applicationType,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        scope: promotion.scope,
        priority: promotion.priority,
        isStackable: promotion.isStackable,
        eligibleSubtotal: promotion.eligibleSubtotal,
        discountAmount,
      });
    }

    const discountAmount = Math.round(accumulatedDiscount * 100) / 100;

    const deliveryFee = 0;
    const taxAmount = 0;

    const totalAmount = Math.max(
      0,
      subtotal - discountAmount + deliveryFee + taxAmount,
    );

    return {
      subtotal,
      discountAmount,
      deliveryFee,
      taxAmount,
      totalAmount,
      appliedPromotions,
    };
  }

  private validateCheckoutRequest(dto: CreateOrderDto): string | null {
    if (dto.paymentMethod !== PaymentMethod.CASH) {
      throw new BadRequestException('Only CASH payment is currently available');
    }

    const deliveryAddress = dto.deliveryAddress?.trim() || null;

    if (dto.orderType === OrderType.DELIVERY && deliveryAddress === null) {
      throw new BadRequestException(
        'Delivery address is required for delivery orders',
      );
    }

    if (dto.orderType !== OrderType.DELIVERY) {
      return null;
    }

    return deliveryAddress;
  }

  private generateOrderNumber(): string {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

    const randomPart = randomBytes(3).toString('hex').toUpperCase();

    return `DG-${timestamp}-${randomPart}`;
  }
}
