import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  DiscountType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  PromotionApplicationType,
  PromotionScope,
  StockMovementType,
} from 'generated/prisma/enums';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PromotionCalculationItem,
  PromotionCalculationService,
} from '../promotions/promotion-calculator.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

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

  async checkout(userId: string, dto: CreateOrderDto) {
    const deliveryAddress = this.validateCheckoutRequest(dto);
    const orderNumber = this.generateOrderNumber();

    return this.prisma.$transaction(
      async (transaction) => {
        const cart = await this.getValidatedCheckoutCart(transaction, userId);

        const pricing = await this.calculateCheckoutPricing(transaction, cart);

        await this.validatePromotionUsage(
          transaction,
          userId,
          pricing.appliedPromotions.map((promotion) => promotion.id),
        );

        const order = await transaction.order.create({
          data: {
            orderNumber,
            userId,
            orderType: dto.orderType,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
            customerNote: dto.customerNote?.trim() || null,
            deliveryAddress,
            subtotal: pricing.subtotal,
            discountAmount: pricing.discountAmount,
            deliveryFee: pricing.deliveryFee,
            taxAmount: pricing.taxAmount,
            totalAmount: pricing.totalAmount,

            items: {
              create: cart.items.map((item) => ({
                productId: item.variant.product.id,
                variantId: item.variant.id,
                productName: item.variant.product.name,
                variantName: item.variant.name,
                sku: item.variant.sku,
                unitPrice: Number(item.variant.price),
                quantity: item.quantity,
                lineTotal: Number(item.variant.price) * item.quantity,
                customerNote: item.note,

                options: {
                  create: [...item.variant.optionValues]
                    .sort(
                      (firstOption, secondOption) =>
                        firstOption.optionValue.option.position -
                        secondOption.optionValue.option.position,
                    )
                    .map(({ optionValue }) => ({
                      optionName: optionValue.option.displayName,
                      optionValue: optionValue.label,
                      position: optionValue.option.position,
                    })),
                },
              })),
            },

            promotions: {
              create: pricing.appliedPromotions.map((promotion) => ({
                promotionId: promotion.id,
                promotionName: promotion.name,
                promotionCode: promotion.code,
                applicationType: promotion.applicationType,
                discountType: promotion.discountType,
                scope: promotion.scope,
                discountValue: promotion.discountValue,
                eligibleSubtotal: promotion.eligibleSubtotal,
                discountAmount: promotion.discountAmount,
                priority: promotion.priority,
                isStackable: promotion.isStackable,
              })),
            },

            statusHistories: {
              create: {
                fromStatus: null,
                toStatus: OrderStatus.PENDING,
                note: 'Order created',
                changedBy: userId,
              },
            },

            payments: {
              create: {
                method: dto.paymentMethod,
                amount: pricing.totalAmount,
              },
            },
          },
          include: {
            items: {
              include: {
                options: {
                  orderBy: {
                    position: 'asc',
                  },
                },
              },
            },
            promotions: true,
            payments: true,
            statusHistories: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        const stockAdjustments = new Map<
          string,
          {
            variantId: string;
            variantName: string;
            quantity: number;
            stockBefore: number;
          }
        >();

        for (const item of cart.items) {
          if (!item.variant.trackStock) {
            continue;
          }

          const existingAdjustment = stockAdjustments.get(item.variant.id);

          if (existingAdjustment) {
            existingAdjustment.quantity += item.quantity;
            continue;
          }

          stockAdjustments.set(item.variant.id, {
            variantId: item.variant.id,
            variantName: item.variant.name,
            quantity: item.quantity,
            stockBefore: item.variant.stock,
          });
        }

        await Promise.all(
          [...stockAdjustments.values()].map(async (adjustment) => {
            const updateResult = await transaction.productVariant.updateMany({
              where: {
                id: adjustment.variantId,
                trackStock: true,
                stock: {
                  gte: adjustment.quantity,
                },
              },
              data: {
                stock: {
                  decrement: adjustment.quantity,
                },
              },
            });

            if (updateResult.count !== 1) {
              throw new BadRequestException(
                `Insufficient stock for variant "${adjustment.variantName}"`,
              );
            }

            await transaction.stockMovement.create({
              data: {
                variantId: adjustment.variantId,
                type: StockMovementType.SALE,
                quantityChange: -adjustment.quantity,
                stockBefore: adjustment.stockBefore,
                stockAfter: adjustment.stockBefore - adjustment.quantity,
                referenceType: 'ORDER',
                referenceId: order.id,
                note: `Stock reduced for order ${order.orderNumber}`,
                createdBy: userId,
              },
            });
          }),
        );

        await Promise.all([
          transaction.cartItem.deleteMany({
            where: {
              cartId: cart.id,
            },
          }),

          transaction.cart.update({
            where: {
              id: cart.id,
            },
            data: {
              couponPromotionId: null,
            },
          }),
        ]);

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async getMyOrders(userId: string, query: OrderQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
      ...(query.orderType
        ? {
            orderType: query.orderType,
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          paymentStatus: true,
          subtotal: true,
          discountAmount: true,
          deliveryFee: true,
          taxAmount: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,

          items: {
            take: 3,
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              productName: true,
              variantName: true,
              quantity: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      this.prisma.order.count({
        where,
      }),
    ]);

    return {
      data: orders.map(({ _count, items, ...order }) => ({
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        deliveryFee: Number(order.deliveryFee),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        totalLineItems: _count.items,
        itemsPreview: items,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getOrdersForAdmin(query: AdminOrderQueryDto) {
    const search = query.search?.trim() || null;

    const createdFrom = query.createdFrom ? new Date(query.createdFrom) : null;

    const createdTo = query.createdTo ? new Date(query.createdTo) : null;

    if (createdFrom !== null && createdTo !== null && createdFrom > createdTo) {
      throw new BadRequestException(
        'createdFrom cannot be later than createdTo',
      );
    }

    const skip = (query.page - 1) * query.limit;

    const where: Prisma.OrderWhereInput = {
      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customerPhone: {
                  contains: search,
                },
              },
            ],
          }
        : {}),

      ...(query.status
        ? {
            status: query.status,
          }
        : {}),

      ...(query.orderType
        ? {
            orderType: query.orderType,
          }
        : {}),

      ...(query.paymentStatus
        ? {
            paymentStatus: query.paymentStatus,
          }
        : {}),

      ...(createdFrom !== null || createdTo !== null
        ? {
            createdAt: {
              ...(createdFrom !== null
                ? {
                    gte: createdFrom,
                  }
                : {}),
              ...(createdTo !== null
                ? {
                    lte: createdTo,
                  }
                : {}),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          paymentStatus: true,

          customerName: true,
          customerPhone: true,

          subtotal: true,
          discountAmount: true,
          deliveryFee: true,
          taxAmount: true,
          totalAmount: true,

          createdAt: true,
          updatedAt: true,

          user: {
            select: {
              id: true,
              email: true,
            },
          },

          items: {
            take: 3,
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              productName: true,
              variantName: true,
              quantity: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      this.prisma.order.count({
        where,
      }),
    ]);

    return {
      data: orders.map(({ _count, items, ...order }) => ({
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        deliveryFee: Number(order.deliveryFee),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        totalLineItems: _count.items,
        itemsPreview: items,
      })),

      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getOrderByIdForAdmin(orderId: string) {
    const orderOwner = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        userId: true,
      },
    });

    if (!orderOwner) {
      throw new NotFoundException('Order not foundd');
    }

    return this.getMyOrderById(orderOwner.userId, orderId);
  }

  async getMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        paymentStatus: true,

        customerName: true,
        customerPhone: true,
        customerNote: true,
        deliveryAddress: true,

        subtotal: true,
        discountAmount: true,
        deliveryFee: true,
        taxAmount: true,
        totalAmount: true,

        confirmedAt: true,
        completedAt: true,
        cancelledAt: true,
        cancellationReason: true,
        createdAt: true,
        updatedAt: true,

        items: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            productId: true,
            variantId: true,
            productName: true,
            variantName: true,
            sku: true,
            unitPrice: true,
            quantity: true,
            lineTotal: true,
            customerNote: true,
            createdAt: true,

            options: {
              orderBy: {
                position: 'asc',
              },
              select: {
                id: true,
                optionName: true,
                optionValue: true,
                position: true,
              },
            },
          },
        },

        promotions: {
          orderBy: [
            {
              priority: 'desc',
            },
            {
              createdAt: 'asc',
            },
          ],
          select: {
            id: true,
            promotionId: true,
            promotionName: true,
            promotionCode: true,
            applicationType: true,
            discountType: true,
            scope: true,
            discountValue: true,
            eligibleSubtotal: true,
            discountAmount: true,
            priority: true,
            isStackable: true,
            createdAt: true,
          },
        },

        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            refundedAmount: true,
            provider: true,
            providerReference: true,
            paymentUrl: true,
            expiresAt: true,
            paidAt: true,
            failedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        statusHistories: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      ...order,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      deliveryFee: Number(order.deliveryFee),
      taxAmount: Number(order.taxAmount),
      totalAmount: Number(order.totalAmount),

      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),

      promotions: order.promotions.map((promotion) => ({
        ...promotion,
        discountValue: Number(promotion.discountValue),
        eligibleSubtotal: Number(promotion.eligibleSubtotal),
        discountAmount: Number(promotion.discountAmount),
      })),

      payments: order.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        refundedAmount: Number(payment.refundedAmount),
      })),
    };
  }

  async cancelMyOrder(userId: string, orderId: string, dto: CancelOrderDto) {
    await this.prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: {
            id: orderId,
            userId,
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        if (order.status !== OrderStatus.PENDING) {
          throw new BadRequestException(
            'Only pending orders can be cancelled by customer',
          );
        }

        if (
          order.paymentStatus === PaymentStatus.PAID ||
          order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
        ) {
          throw new BadRequestException(
            'Paid orders cannot be cancelled before the refund process is completed',
          );
        }

        const updateResult = await transaction.order.updateMany({
          where: {
            id: order.id,
            userId,
            status: OrderStatus.PENDING,
          },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: dto.reason,
          },
        });

        if (updateResult.count !== 1) {
          throw new BadRequestException(
            'Order status has changed and can no longer be cancelled',
          );
        }

        await this.restoredOrderStock(
          transaction,
          {
            id: order.id,
            orderNumber: order.orderNumber,
          },
          userId,
        );

        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CANCELLED,
            note: dto.reason,
            changedBy: userId,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.getMyOrderById(userId, orderId);
  }

  async updateOrderStatus(
    adminUserId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findUnique({
          where: {
            id: orderId,
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            orderType: true,
            paymentStatus: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        this.validateStatusTransition(
          order.status,
          dto.status,
          order.orderType,
        );

        if (
          dto.status === OrderStatus.CANCELLED &&
          (order.paymentStatus === PaymentStatus.PAID ||
            order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED)
        ) {
          throw new BadRequestException(
            'Paid orders cannot be cancelled before the refund process is completed',
          );
        }

        const note = dto.note?.trim() || null;

        if (dto.status === OrderStatus.CANCELLED && note === null) {
          throw new BadRequestException('Cancellation note is required');
        }

        const changedAt = new Date();

        const updateResult = await transaction.order.updateMany({
          where: {
            id: order.id,
            status: order.status,
          },
          data: {
            status: dto.status,

            ...(dto.status === OrderStatus.CONFIRMED
              ? {
                  confirmedAt: changedAt,
                }
              : {}),

            ...(dto.status === OrderStatus.COMPLETED
              ? {
                  completedAt: changedAt,
                }
              : {}),

            ...(dto.status === OrderStatus.CANCELLED
              ? {
                  cancelledAt: changedAt,
                  cancellationReason: note,
                }
              : {}),
          },
        });

        if (updateResult.count !== 1) {
          throw new BadRequestException(
            'Order status has changed. Please reload the order and try again',
          );
        }

        if (dto.status === OrderStatus.CANCELLED) {
          await this.restoredOrderStock(
            transaction,
            {
              id: order.id,
              orderNumber: order.orderNumber,
            },
            adminUserId,
          );
        }

        await transaction.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: dto.status,
            note,
            changedBy: adminUserId,
          },
        });

        return transaction.order.findUnique({
          where: {
            id: order.id,
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            orderType: true,
            paymentStatus: true,
            confirmedAt: true,
            completedAt: true,
            cancelledAt: true,
            cancellationReason: true,
            updatedAt: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async updatePaymentStatus(
    adminUserId: string,
    orderId: string,
    paymentId: string,
    dto: UpdatePaymentStatusDto,
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const payment = await transaction.payment.findFirst({
          where: {
            id: paymentId,
            orderId,
          },
          select: {
            id: true,
            orderId: true,
            method: true,
            status: true,
            amount: true,
            refundedAmount: true,
            metadata: true,
            order: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException('Payment not found');
        }

        if (payment.order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException(
            'Payment status of a cancelled order cannot be changed',
          );
        }

        this.validatePaymentStatusTransition(payment.status, dto.status);

        const note = dto.note?.trim() || null;
        const changedAt = new Date();

        const existingMetadata =
          payment.metadata !== null &&
          typeof payment.metadata === 'object' &&
          !Array.isArray(payment.metadata)
            ? payment.metadata
            : {};

        const metadata: Prisma.InputJsonObject = {
          ...existingMetadata,
          ...(note !== null
            ? {
                statusNote: note,
              }
            : {}),
          statusUpdatedBy: adminUserId,
          statusUpdatedAt: changedAt.toISOString(),
        };

        const updateResult = await transaction.payment.updateMany({
          where: {
            id: payment.id,
            orderId,
            status: payment.status,
          },
          data: {
            status: dto.status,
            metadata,

            ...(dto.status === PaymentStatus.PAID
              ? {
                  paidAt: changedAt,
                  failedAt: null,
                }
              : {}),

            ...(dto.status === PaymentStatus.FAILED
              ? {
                  paidAt: null,
                  failedAt: changedAt,
                }
              : {}),

            ...(dto.status === PaymentStatus.PENDING
              ? {
                  paidAt: null,
                  failedAt: null,
                }
              : {}),
          },
        });

        if (updateResult.count !== 1) {
          throw new BadRequestException(
            'Payment status has changed. Please reload the order and try again',
          );
        }

        await transaction.order.update({
          where: {
            id: orderId,
          },
          data: {
            paymentStatus: dto.status,
          },
        });

        return {
          id: payment.id,
          orderId: payment.orderId,
          method: payment.method,
          previousStatus: payment.status,
          status: dto.status,
          amount: Number(payment.amount),
          refundedAmount: Number(payment.refundedAmount),
          note,
          paidAt: dto.status === PaymentStatus.PAID ? changedAt : null,
          failedAt: dto.status === PaymentStatus.FAILED ? changedAt : null,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

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

    const couponCalculation = cart.couponPromotion
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

    if (cart.couponPromotion && couponCalculation?.isEligible !== true) {
      throw new BadRequestException(
        `Applied coupon is no longer valid: ${
          couponCalculation?.ineligibleReason ?? 'unknown reason'
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

    if (cart.couponPromotion && couponCalculation?.isEligible === true) {
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

    if (cart.couponPromotion && couponCalculation?.isEligible === true) {
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
        eligibleSubtotal: couponCalculation.eligibleSubtotal,
        calculatedDiscountAmount: couponCalculation.discountAmount,
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

  private async validatePromotionUsage(
    transaction: Prisma.TransactionClient,
    userId: string,
    promotionIds: string[],
  ): Promise<void> {
    if (promotionIds.length === 0) {
      return;
    }

    const uniquePromotionIds = [...new Set(promotionIds)];

    const promotions = await transaction.promotion.findMany({
      where: {
        id: {
          in: uniquePromotionIds,
        },
      },
      select: {
        id: true,
        name: true,
        usageLimit: true,
        usageLimitPerUser: true,
      },
    });

    if (promotions.length !== uniquePromotionIds.length) {
      throw new BadRequestException(
        'One or more promotions are no longer available',
      );
    }

    const [totalUsageRows, userUsageRows] = await Promise.all([
      transaction.orderPromotion.groupBy({
        by: ['promotionId'],
        where: {
          promotionId: {
            in: uniquePromotionIds,
          },
          order: {
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
      transaction.orderPromotion.groupBy({
        by: ['promotionId'],
        where: {
          promotionId: {
            in: uniquePromotionIds,
          },
          order: {
            userId,
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const totalUsageByPromotion = new Map(
      totalUsageRows.map((usage) => [usage.promotionId, usage._count._all]),
    );

    const userUsageByPromotion = new Map(
      userUsageRows.map((usage) => [usage.promotionId, usage._count._all]),
    );

    for (const promotion of promotions) {
      const totalUsage = totalUsageByPromotion.get(promotion.id) ?? 0;

      const userUsage = userUsageByPromotion.get(promotion.id) ?? 0;

      if (promotion.usageLimit !== null && totalUsage >= promotion.usageLimit) {
        throw new BadRequestException(
          `Promotion "${promotion.name}" has reached its usage limit`,
        );
      }

      if (
        promotion.usageLimitPerUser !== null &&
        userUsage >= promotion.usageLimitPerUser
      ) {
        throw new BadRequestException(
          `You have reached the usage limit for promotion "${promotion.name}"`,
        );
      }
    }
  }

  private async restoredOrderStock(
    transaction: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
    },
    changedBy: string,
  ): Promise<void> {
    const saleMovements = await transaction.stockMovement.findMany({
      where: {
        referenceType: 'ORDER',
        referenceId: order.id,
        type: StockMovementType.SALE,
      },
      select: {
        variantId: true,
        quantityChange: true,
        variant: {
          select: {
            stock: true,
          },
        },
      },
    });

    await Promise.all(
      saleMovements.map(async (movement) => {
        const restoredQuantity = Math.abs(movement.quantityChange);

        await transaction.productVariant.update({
          where: {
            id: movement.variantId,
          },
          data: {
            stock: {
              increment: restoredQuantity,
            },
          },
        });

        await transaction.stockMovement.create({
          data: {
            variantId: movement.variantId,
            type: StockMovementType.CANCELLATION,
            quantityChange: restoredQuantity,
            stockBefore: movement.variant.stock,
            stockAfter: movement.variant.stock + restoredQuantity,
            referenceType: 'ORDER',
            referenceId: order.id,
            note: `Stock restored because order ${order.orderNumber} was cancelled`,
            createdBy: changedBy,
          },
        });
      }),
    );
  }

  private validatePaymentStatusTransition(
    currentStatus: PaymentStatus,
    nextStatus: PaymentStatus,
  ): void {
    const allowedTransition: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
      [PaymentStatus.PAID]: [],
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
      [PaymentStatus.EXPIRED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIALLY_REFUNDED]: [],
    };

    if (currentStatus === nextStatus) {
      throw new BadRequestException(
        `Payment is already in ${currentStatus} status`,
      );
    }

    if (!allowedTransition[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Payment status cannot be changed from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    orderType: OrderType,
  ) {
    const allowedTransition: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.COMPLETED,
      ],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (currentStatus === nextStatus) {
      throw new BadRequestException(
        `Order is already in ${currentStatus} status`,
      );
    }

    if (!allowedTransition[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Order status cannot be changed from ${currentStatus} to ${nextStatus}`,
      );
    }

    if (
      currentStatus === OrderStatus.READY &&
      nextStatus === OrderStatus.OUT_FOR_DELIVERY &&
      orderType !== OrderType.DELIVERY
    ) {
      throw new BadRequestException(
        'Only delivery orders can be changed to OUT_FOR_DELIVERY',
      );
    }

    if (
      currentStatus === OrderStatus.READY &&
      nextStatus === OrderStatus.COMPLETED &&
      orderType === OrderType.DELIVERY
    ) {
      throw new BadRequestException(
        `Delivery order must be changed to OUT_FOR_DELIVERY before COMPLETED`,
      );
    }
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
