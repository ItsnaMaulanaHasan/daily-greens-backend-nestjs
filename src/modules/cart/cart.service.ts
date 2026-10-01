import { Injectable } from '@nestjs/common';
import { ProductStatus } from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}
