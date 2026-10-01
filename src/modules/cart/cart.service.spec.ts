import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus } from 'generated/prisma/enums';
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

  const productVariantFindUniqueMock = jest.fn();
  const transactionMock = jest.fn();

  beforeEach(async () => {
    cartFindUniqueMock.mockReset();
    cartUpsertMock.mockReset();

    cartItemFindFirstMock.mockReset();
    cartItemAggregateMock.mockReset();
    cartItemCreateMock.mockReset();
    cartItemUpdateMock.mockReset();
    cartItemDeleteMock.mockReset();
    cartItemDeleteManyMock.mockReset();

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
      items: [],
      summary: {
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
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
});
