import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  OrderType,
  PaymentMethod,
  ProductStatus,
} from 'generated/prisma/enums';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PromotionCalculationService } from '../promotions/promotion-calculator.service';
import { CreateOrderDto } from './dto/create-order.dto';

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
