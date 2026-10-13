import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
  StockMovementType,
} from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PromotionCalculationService } from '../promotions/promotion-calculator.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const orderFindFirstMock = jest.fn();
  const orderFindManyMock = jest.fn();
  const orderCountMock = jest.fn();
  const promotionCalculateMock = jest.fn();
  const transactionMock = jest.fn();

  const orderUpdateManyMock = jest.fn();
  const stockMovementFindManyMock = jest.fn();
  const stockMovementCreateMock = jest.fn();
  const productVariantUpdateMock = jest.fn();
  const orderStatusHistoryCreateMock = jest.fn();

  beforeEach(async () => {
    orderFindFirstMock.mockReset();
    orderFindManyMock.mockReset();
    orderCountMock.mockReset();
    promotionCalculateMock.mockReset();
    transactionMock.mockReset();

    orderUpdateManyMock.mockReset();
    stockMovementFindManyMock.mockReset();
    stockMovementCreateMock.mockReset();
    productVariantUpdateMock.mockReset();
    orderStatusHistoryCreateMock.mockReset();

    transactionMock.mockImplementation(
      async (
        callback: (transaction: {
          order: {
            findFirst: typeof orderFindFirstMock;
            updateMany: typeof orderUpdateManyMock;
          };
          stockMovement: {
            findMany: typeof stockMovementFindManyMock;
            create: typeof stockMovementCreateMock;
          };
          productVariant: {
            update: typeof productVariantUpdateMock;
          };
          orderStatusHistory: {
            create: typeof orderStatusHistoryCreateMock;
          };
        }) => Promise<unknown>,
      ) =>
        callback({
          order: {
            findFirst: orderFindFirstMock,
            updateMany: orderUpdateManyMock,
          },
          stockMovement: {
            findMany: stockMovementFindManyMock,
            create: stockMovementCreateMock,
          },
          productVariant: {
            update: productVariantUpdateMock,
          },
          orderStatusHistory: {
            create: orderStatusHistoryCreateMock,
          },
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findFirst: orderFindFirstMock,
              findMany: orderFindManyMock,
              count: orderCountMock,
            },
            $transaction: transactionMock,
          },
        },
        {
          provide: PromotionCalculationService,
          useValue: {
            calculate: promotionCalculateMock,
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return paginated orders belonging to the user', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    const createdAt = new Date('2026-10-13T08:00:00.000Z');

    const updatedAt = new Date('2026-10-13T08:00:00.000Z');

    orderFindManyMock.mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        orderNumber: 'DG-20261013080000-ABC123',
        status: OrderStatus.PENDING,
        orderType: OrderType.DELIVERY,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 50000,
        discountAmount: 5000,
        deliveryFee: 0,
        taxAmount: 0,
        totalAmount: 45000,
        createdAt,
        updatedAt,
        items: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            productName: 'Kopi Susu',
            variantName: 'Dingin - Large',
            quantity: 2,
          },
        ],
        _count: {
          items: 1,
        },
      },
    ]);

    orderCountMock.mockResolvedValue(11);

    const query: OrderQueryDto = {
      status: OrderStatus.PENDING,
      orderType: OrderType.DELIVERY,
      page: 2,
      limit: 10,
    };

    await expect(service.getMyOrders(userId, query)).resolves.toEqual({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          orderNumber: 'DG-20261013080000-ABC123',
          status: OrderStatus.PENDING,
          orderType: OrderType.DELIVERY,
          paymentStatus: PaymentStatus.PENDING,
          subtotal: 50000,
          discountAmount: 5000,
          deliveryFee: 0,
          taxAmount: 0,
          totalAmount: 45000,
          createdAt,
          updatedAt,
          totalLineItems: 1,
          itemsPreview: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              productName: 'Kopi Susu',
              variantName: 'Dingin - Large',
              quantity: 2,
            },
          ],
        },
      ],
      meta: {
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
      },
    });

    expect(orderFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId,
          status: OrderStatus.PENDING,
          orderType: OrderType.DELIVERY,
        },
        skip: 10,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );

    expect(orderCountMock).toHaveBeenCalledWith({
      where: {
        userId,
        status: OrderStatus.PENDING,
        orderType: OrderType.DELIVERY,
      },
    });
  });

  it('should return an order detail belonging to the user', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    const orderId = '22222222-2222-4222-8222-222222222222';

    orderFindFirstMock.mockResolvedValue({
      id: orderId,
      orderNumber: 'DG-20261013080000-ABC123',
      status: OrderStatus.PENDING,
      orderType: OrderType.DELIVERY,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 50000,
      discountAmount: 5000,
      deliveryFee: 0,
      taxAmount: 0,
      totalAmount: 45000,
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          productName: 'Kopi Susu',
          variantName: 'Dingin - Large',
          unitPrice: 25000,
          quantity: 2,
          lineTotal: 50000,
          options: [],
        },
      ],
      promotions: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          promotionName: 'Diskon Customer',
          discountValue: 10,
          eligibleSubtotal: 50000,
          discountAmount: 5000,
        },
      ],
      payments: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          method: 'CASH',
          status: PaymentStatus.PENDING,
          amount: 45000,
          refundedAmount: 0,
        },
      ],
      statusHistories: [],
    });

    const result = await service.getMyOrderById(userId, orderId);

    expect(orderFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: orderId,
          userId,
        },
      }),
    );

    expect(result).toMatchObject({
      id: orderId,
      subtotal: 50000,
      discountAmount: 5000,
      totalAmount: 45000,
      items: [
        {
          unitPrice: 25000,
          lineTotal: 50000,
        },
      ],
      promotions: [
        {
          discountValue: 10,
          eligibleSubtotal: 50000,
          discountAmount: 5000,
        },
      ],
      payments: [
        {
          amount: 45000,
          refundedAmount: 0,
        },
      ],
    });
  });

  it('should reject an order that does not belong to the user', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    const orderId = '22222222-2222-4222-8222-222222222222';

    orderFindFirstMock.mockResolvedValue(null);

    await expect(
      service.getMyOrderById(userId, orderId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(orderFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: orderId,
          userId,
        },
      }),
    );
  });

  it('should reject cancellation when order is not pending', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    const orderId = '22222222-2222-4222-8222-222222222222';

    orderFindFirstMock.mockResolvedValue({
      id: orderId,
      orderNumber: 'DG-20261013080000-ABC123',
      status: OrderStatus.CONFIRMED,
    });

    await expect(
      service.cancelMyOrder(userId, orderId, {
        reason: 'Saya ingin membatalkan pesanan ini',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(orderFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });
  });

  it('should cancel a pending order and restore its stock', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    const orderId = '22222222-2222-4222-8222-222222222222';

    const variantId = '33333333-3333-4333-8333-333333333333';

    const reason = 'Saya salah memilih alamat pengiriman';

    orderFindFirstMock
      .mockResolvedValueOnce({
        id: orderId,
        orderNumber: 'DG-20261013080000-ABC123',
        status: OrderStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: orderId,
        orderNumber: 'DG-20261013080000-ABC123',
        status: OrderStatus.CANCELLED,
        orderType: OrderType.DELIVERY,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 50000,
        discountAmount: 0,
        deliveryFee: 0,
        taxAmount: 0,
        totalAmount: 50000,
        cancellationReason: reason,
        items: [],
        promotions: [],
        payments: [],
        statusHistories: [],
      });

    stockMovementFindManyMock.mockResolvedValue([
      {
        variantId,
        quantityChange: -2,
        variant: {
          id: variantId,
          name: 'Dingin - Large',
          stock: 8,
        },
      },
    ]);

    orderUpdateManyMock.mockResolvedValue({
      count: 1,
    });

    productVariantUpdateMock.mockResolvedValue({
      id: variantId,
      stock: 10,
    });

    stockMovementCreateMock.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
    });

    orderStatusHistoryCreateMock.mockResolvedValue({
      id: '55555555-5555-4555-8555-555555555555',
    });

    const result = await service.cancelMyOrder(userId, orderId, {
      reason,
    });

    expect(orderUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: expect.any(Date) as Date,
        cancellationReason: reason,
      },
    });

    expect(productVariantUpdateMock).toHaveBeenCalledWith({
      where: {
        id: variantId,
      },
      data: {
        stock: {
          increment: 2,
        },
      },
    });

    expect(stockMovementCreateMock).toHaveBeenCalledWith({
      data: {
        variantId,
        type: StockMovementType.CANCELLATION,
        quantityChange: 2,
        stockBefore: 8,
        stockAfter: 10,
        referenceType: 'ORDER',
        referenceId: orderId,
        note: 'Stock restored because order DG-20261013080000-ABC123 was cancelled',
        createdBy: userId,
      },
    });

    expect(orderStatusHistoryCreateMock).toHaveBeenCalledWith({
      data: {
        orderId,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CANCELLED,
        note: reason,
        changedBy: userId,
      },
    });

    expect(result).toMatchObject({
      id: orderId,
      status: OrderStatus.CANCELLED,
      cancellationReason: reason,
    });
  });
});
