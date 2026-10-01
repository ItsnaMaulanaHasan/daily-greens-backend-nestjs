import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

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
        item.variant.trackStock && item.variant.deletedAt === null;

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
        unavailableReason = 'Insuffient stock';
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
          stock: item.variant.name,
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
      },
      subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
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

    if (variant?.deletedAt !== null) {
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
          `Insufficient stock, Available stock: ${variant.stock}`,
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
}
