import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DiscountType,
  PromotionApplicationType,
  PromotionScope,
} from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionService } from './promotion.service';

describe('PromotionService', () => {
  let service: PromotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: PrismaService,
          useValue: {
            promotion: {
              create: jest.fn(),
            },
            productCategory: {
              count: jest.fn(),
            },
            product: {
              count: jest.fn(),
            },
            productVariant: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  const createValidDto = (): CreatePromotionDto => ({
    name: 'Diskon Akhir Pekan',
    applicationType: PromotionApplicationType.AUTOMATIC,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    scope: PromotionScope.ALL_PRODUCTS,
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-10-31T23:59:59.000Z',
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject an invalid promotion period', async () => {
    const dto = createValidDto();

    dto.startsAt = '2026-10-31T23:59:59.000Z';
    dto.endsAt = '2026-10-01T00:00:00.000Z';

    await expect(
      service.createPromotion('11111111-1111-4111-8111-111111111111', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should require a code for coupon promotion', async () => {
    const dto = createValidDto();

    dto.applicationType = PromotionApplicationType.COUPON;

    await expect(
      service.createPromotion('11111111-1111-4111-8111-111111111111', dto),
    ).rejects.toThrow('Promotion code is required for coupon promotion');
  });

  it('should reject percentage discount above 100', async () => {
    const dto = createValidDto();

    dto.discountValue = 101;

    await expect(
      service.createPromotion('11111111-1111-4111-8111-111111111111', dto),
    ).rejects.toThrow('Percentage discount cannot exceed 100');
  });
});
