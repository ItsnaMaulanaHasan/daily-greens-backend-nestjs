import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DiscountType,
  ProductStatus,
  PromotionScope,
} from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const cartFindUniqueMock = jest.fn();
  const cartUpsertMock = jest.fn();

  const cartItemFindFirstMock = jest.fn();
  const cartItemAggregateMock = jest.fn();
  const cartItemCreateMock = jest.fn();
  const cartItemUpdateMock = jest.fn();
  const cartItemDeleteMock = jest.fn();
  const cartItemDeleteManyMock = jest.fn();

  const promotionFindManyMock = jest.fn();

  const productVariantFindUniqueMock = jest.fn();
  const transactionMock = jest.fn();

  const createCartWithSingleItem = () => ({
    id: '22222222-2222-4222-8222-222222222222',
    userId: '11111111-1111-4111-8111-111111111111',
    couponPromotion: null,
    items: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        variantId: '44444444-4444-4444-8444-444444444444',
        quantity: 1,
        note: null,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
        variant: {
          id: '44444444-4444-4444-8444-444444444444',
          sku: 'KOPI-PANAS',
          name: 'Panas',
          price: 50000,
          stock: 10,
          trackStock: true,
          isActive: true,
          deletedAt: null,
          product: {
            id: '55555555-5555-4555-8555-555555555555',
            categoryId: '66666666-6666-4666-8666-666666666666',
            name: 'Kopi Susu',
            slug: 'kopi-susu',
            status: ProductStatus.ACTIVE,
            deletedAt: null,
            images: [],
          },
        },
      },
    ],
  });

  beforeEach(async () => {
    cartFindUniqueMock.mockReset();
    cartUpsertMock.mockReset();

    cartItemFindFirstMock.mockReset();
    cartItemAggregateMock.mockReset();
    cartItemCreateMock.mockReset();
    cartItemUpdateMock.mockReset();
    cartItemDeleteMock.mockReset();
    cartItemDeleteManyMock.mockReset();

    promotionFindManyMock.mockReset();
    promotionFindManyMock.mockResolvedValue([]);

    productVariantFindUniqueMock.mockReset();
    transactionMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: {
            cart: {
              findUnique: cartFindUniqueMock,
              upsert: cartUpsertMock,
            },
            promotion: {
              findMany: promotionFindManyMock,
            },
            cartItem: {
              findFirst: cartItemFindFirstMock,
              aggregate: cartItemAggregateMock,
              create: cartItemCreateMock,
              update: cartItemUpdateMock,
              delete: cartItemDeleteMock,
              deleteMany: cartItemDeleteManyMock,
            },
            productVariant: {
              findUnique: productVariantFindUniqueMock,
            },
            $transaction: transactionMock,
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an empty cart when user has no cart', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    cartFindUniqueMock.mockResolvedValue(null);

    await expect(service.getMyCart(userId)).resolves.toEqual({
      id: null,
      userId,
      coupon: null,
      automaticPromotions: [],
      items: [],
      summary: {
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
        discount: 0,
        grandTotal: 0,
      },
    });
  });

  it('should treat a non-stock-tracked active variant as available', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const cartId = '22222222-2222-4222-8222-222222222222';
    const itemId = '33333333-3333-4333-8333-333333333333';
    const createdAt = new Date('2026-10-01T00:00:00.000Z');
    const updatedAt = new Date('2026-10-01T00:00:00.000Z');

    cartFindUniqueMock.mockResolvedValue({
      id: cartId,
      userId,
      couponPromotion: null,
      items: [
        {
          id: itemId,
          quantity: 2,
          note: null,
          createdAt,
          updatedAt,
          variant: {
            id: '44444444-4444-4444-8444-444444444444',
            sku: 'KOPI-PANAS',
            name: 'Panas',
            price: 25000,
            stock: 0,
            trackStock: false,
            isActive: true,
            deletedAt: null,
            product: {
              id: '55555555-5555-4555-8555-555555555555',
              name: 'Kopi Susu',
              slug: 'kopi-susu',
              status: ProductStatus.ACTIVE,
              deletedAt: null,
              images: [],
            },
          },
        },
      ],
    });

    await expect(service.getMyCart(userId)).resolves.toEqual({
      id: cartId,
      userId,
      coupon: null,
      automaticPromotions: [],
      items: [
        {
          id: itemId,
          quantity: 2,
          note: null,
          unitPrice: 25000,
          lineTotal: 50000,
          isAvailable: true,
          unavailableReason: null,
          createdAt,
          updatedAt,
          variant: {
            id: '44444444-4444-4444-8444-444444444444',
            sku: 'KOPI-PANAS',
            name: 'Panas',
            stock: 0,
            trackStock: false,
            product: {
              id: '55555555-5555-4555-8555-555555555555',
              name: 'Kopi Susu',
              slug: 'kopi-susu',
              image: null,
            },
          },
        },
      ],
      summary: {
        totalItems: 1,
        totalQuantity: 2,
        subtotal: 50000,
        discount: 0,
        grandTotal: 50000,
      },
    });
  });

  it('should reject adding an unknown product variant', async () => {
    productVariantFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.addItem('11111111-1111-4111-8111-111111111111', {
        variantId: '44444444-4444-4444-8444-444444444444',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('should reject an empty cart item update', async () => {
    await expect(
      service.updateItem(
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cartItemFindFirstMock).not.toHaveBeenCalled();
  });

  it('should update note without requiring a quantity change', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const cartItemId = '33333333-3333-4333-8333-333333333333';

    cartItemFindFirstMock.mockResolvedValue({
      id: cartItemId,
      cartId: '22222222-2222-4222-8222-222222222222',
      variantId: '44444444-4444-4444-8444-444444444444',
      quantity: 2,
      variant: {
        stock: 10,
        trackStock: true,
        isActive: true,
        deletedAt: null,
        product: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          allowCustomerNote: true,
        },
      },
    });

    cartItemUpdateMock.mockResolvedValue({
      id: cartItemId,
    });

    cartFindUniqueMock.mockResolvedValue(null);

    await service.updateItem(userId, cartItemId, {
      note: 'Tanpa gula',
    });

    expect(cartItemAggregateMock).not.toHaveBeenCalled();

    expect(cartItemUpdateMock).toHaveBeenCalledWith({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: undefined,
        note: 'Tanpa gula',
      },
    });
  });

  it('should apply only the highest-priority non-stackable automatic promotion', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    cartFindUniqueMock.mockResolvedValue(createCartWithSingleItem());

    promotionFindManyMock.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Diskon Prioritas',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        priority: 10,
        isStackable: false,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Diskon Prioritas Rendah',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 10000,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        priority: 5,
        isStackable: false,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
    ]);

    const result = await service.getMyCart(userId);

    expect(result).toMatchObject({
      automaticPromotions: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          name: 'Diskon Prioritas',
          discountAmount: 5000,
        },
      ],
      summary: {
        subtotal: 50000,
        discount: 5000,
        grandTotal: 45000,
      },
    });
  });

  it('should combine stackable automatic promotions', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    cartFindUniqueMock.mockResolvedValue(createCartWithSingleItem());

    promotionFindManyMock.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Diskon Sepuluh Persen',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        priority: 10,
        isStackable: true,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Potongan Tiga Ribu',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 3000,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        priority: 5,
        isStackable: true,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
    ]);

    const result = await service.getMyCart(userId);

    expect(result).toMatchObject({
      automaticPromotions: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          discountAmount: 5000,
        },
        {
          id: '88888888-8888-4888-8888-888888888888',
          discountAmount: 3000,
        },
      ],
      summary: {
        subtotal: 50000,
        discount: 8000,
        grandTotal: 42000,
      },
    });
  });

  it('Should not apply automatic promotions when an eligible coupon is not stackable', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    cartFindUniqueMock.mockResolvedValue({
      ...createCartWithSingleItem(),
      couponPromotion: {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Coupon Dua Puluh Persen',
        code: 'CART20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        isStackable: false,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
    });

    promotionFindManyMock.mockResolvedValue([
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Promotion Otomatis',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 5000,
        maximumDiscount: null,
        minimumOrderAmount: null,
        minimumQuantity: null,
        scope: PromotionScope.ALL_PRODUCTS,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2099-12-31T23:59:59.000Z'),
        priority: 10,
        isStackable: true,
        isActive: true,
        deletedAt: null,
        categoryTargets: [],
        productTargets: [],
        variantTargets: [],
      },
    ]);

    const result = await service.getMyCart(userId);

    expect(result).toMatchObject({
      coupon: {
        id: '99999999-9999-4999-8999-999999999999',
        code: 'CART20',
        isEligible: true,
        discountAmount: 10000,
      },
      automaticPromotions: [],
      summary: {
        subtotal: 50000,
        discount: 10000,
        grandTotal: 40000,
      },
    });
  });
});
