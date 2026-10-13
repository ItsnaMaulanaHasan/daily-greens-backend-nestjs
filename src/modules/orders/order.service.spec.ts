import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, OrderType, PaymentStatus } from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PromotionCalculationService } from '../promotions/promotion-calculator.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const orderFindManyMock = jest.fn();
  const orderCountMock = jest.fn();
  const promotionCalculateMock = jest.fn();

  beforeEach(async () => {
    orderFindManyMock.mockReset();
    orderCountMock.mockReset();
    promotionCalculateMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: orderFindManyMock,
              count: orderCountMock,
            },
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
});
