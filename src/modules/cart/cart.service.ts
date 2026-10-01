import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductStatus,
  PromotionApplicationType,
} from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApplyCartCouponDto } from './dto/apply-cart-coupon.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: {
                        deletedAt: null,
                        isPrimary: true,
                      },
                      select: {
                        imageUrl: true,
                        altText: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        userId,
        items: [],
        summary: {
          totalItems: 0,
          totalQuantity: 0,
          subtotal: 0,
        },
      };
    }

    const items = cart.items.map((item) => {
      const unitPrice = Number(item.variant.price);
      const lineTotal = unitPrice * item.quantity;

      const isProductAvailable =
        item.variant.product.status === ProductStatus.ACTIVE &&
        item.variant.product.deletedAt === null;

      const isVariantAvailable =
        item.variant.isActive && item.variant.deletedAt === null;

      const hasEnoughStock =
        !item.variant.trackStock || item.variant.stock >= item.quantity;

      const isAvailable =
        isProductAvailable && isVariantAvailable && hasEnoughStock;

      let unavailableReason: string | null = null;

      if (!isProductAvailable) {
        unavailableReason = 'Product is unavailable';
      } else if (!isVariantAvailable) {
        unavailableReason = 'Product variant is unavailable';
      } else if (!hasEnoughStock) {
        unavailableReason = 'Insufficient stock';
      }

      return {
        id: item.id,
        quantity: item.quantity,
        note: item.note,
        unitPrice,
        lineTotal,
        isAvailable,
        unavailableReason,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name,
          stock: item.variant.stock,
          trackStock: item.variant.trackStock,
          product: {
            id: item.variant.product.id,
            name: item.variant.product.name,
            slug: item.variant.product.slug,
            image: item.variant.product.images[0] ?? null,
          },
        },
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      summary: {
        totalItems: items.length,
        totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
        subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
      },
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: {
        id: dto.variantId,
      },
      select: {
        id: true,
        stock: true,
        trackStock: true,
        isActive: true,
        deletedAt: true,
        product: {
          select: {
            status: true,
            deletedAt: true,
            allowCustomerNote: true,
          },
        },
      },
    });

    if (!variant || variant.deletedAt !== null) {
      throw new NotFoundException('Product variant not found');
    }

    if (
      !variant.isActive ||
      variant.product.status !== ProductStatus.ACTIVE ||
      variant.product.deletedAt !== null
    ) {
      throw new BadRequestException('Product variant is unavailable');
    }

    const normalizeNote = dto.note?.trim() || null;

    if (normalizeNote && !variant.product.allowCustomerNote) {
      throw new BadRequestException(
        'Customer note is not allowed for this product',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.upsert({
        where: {
          userId,
        },
        create: {
          userId,
        },
        update: {},
        select: {
          id: true,
        },
      });

      const existingItem = await transaction.cartItem.findFirst({
        where: {
          cartId: cart.id,
          variantId: variant.id,
          note: normalizeNote,
        },
        select: {
          id: true,
        },
      });

      const quantitySummary = await transaction.cartItem.aggregate({
        where: {
          cartId: cart.id,
          variantId: variant.id,
        },
        _sum: {
          quantity: true,
        },
      });

      const currentQuantity = quantitySummary._sum.quantity ?? 0;
      const newTotalQuantity = currentQuantity + dto.quantity;

      if (newTotalQuantity > 99) {
        throw new BadRequestException(
          'Maximum quantity for this product variant is 99',
        );
      }

      if (variant.trackStock && newTotalQuantity > variant.stock) {
        throw new BadRequestException(
          `Insufficient stock. Available stock: ${variant.stock}`,
        );
      }

      if (existingItem) {
        await transaction.cartItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: {
              increment: dto.quantity,
            },
          },
        });

        return;
      }

      await transaction.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          quantity: dto.quantity,
          note: normalizeNote,
        },
      });
    });

    return this.getMyCart(userId);
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    if (dto.quantity === undefined && dto.note === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: {
          userId,
        },
      },
      select: {
        id: true,
        cartId: true,
        variantId: true,
        quantity: true,
        variant: {
          select: {
            stock: true,
            trackStock: true,
            isActive: true,
            deletedAt: true,
            product: {
              select: {
                status: true,
                deletedAt: true,
                allowCustomerNote: true,
              },
            },
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (
      !cartItem.variant.isActive ||
      cartItem.variant.deletedAt !== null ||
      cartItem.variant.product.status !== ProductStatus.ACTIVE ||
      cartItem.variant.product.deletedAt !== null
    ) {
      throw new BadRequestException('Product variant is unavailable');
    }

    const normalizeNote =
      dto.note === undefined ? undefined : dto.note?.trim() || null;

    if (normalizeNote && !cartItem.variant.product.allowCustomerNote) {
      throw new BadRequestException(
        'Customer note is not allowed for this product',
      );
    }

    if (dto.quantity !== undefined) {
      const quantitySummary = await this.prisma.cartItem.aggregate({
        where: {
          cartId: cartItem.cartId,
          variantId: cartItem.variantId,
          id: {
            not: cartItem.id,
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const otherItemsQuantity = quantitySummary._sum.quantity ?? 0;

      const newTotalQuantity = otherItemsQuantity + dto.quantity;

      if (newTotalQuantity > 99) {
        throw new BadRequestException(
          'Maximum quantity for this product variant is 99',
        );
      }

      if (
        cartItem.variant.trackStock &&
        newTotalQuantity > cartItem.variant.stock
      ) {
        throw new BadRequestException(
          `Insufficient stock. Available stock: ${cartItem.variant.stock}`,
        );
      }
    }

    await this.prisma.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity: dto.quantity,
        ...(dto.note !== undefined && {
          note: normalizeNote,
        }),
      },
    });

    return this.getMyCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: {
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    return this.getMyCart(userId);
  }

  async clearMyCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!cart) {
      return this.getMyCart(userId);
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return this.getMyCart(userId);
  }

  async applyCoupon(userId: string, dto: ApplyCartCouponDto) {
    const now = new Date();

    const promotion = await this.prisma.promotion.findFirst({
      where: {
        code: dto.code,
        applicationType: PromotionApplicationType.COUPON,
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
      },
    });

    if (!promotion) {
      throw new BadRequestException('Coupon is invalid or unavailable');
    }

    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!cart || cart._count.items === 0) {
      throw new BadRequestException(
        'Coupon cannot be applied to an empty cart',
      );
    }

    await this.prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        couponPromotionId: promotion.id,
      },
    });

    return this.getMyCart(userId);
  }
}
