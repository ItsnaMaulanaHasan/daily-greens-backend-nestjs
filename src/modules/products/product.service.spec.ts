import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus } from 'generated/prisma/enums';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  const productCategoryFindFirstMock = jest.fn();
  const productFindFirstMock = jest.fn();

  beforeEach(async () => {
    productCategoryFindFirstMock.mockReset();
    productFindFirstMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: {
            productCategory: {
              findFirst: productCategoryFindFirstMock,
            },
            product: {
              findFirst: productFindFirstMock,
            },
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadProductImage: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject product creation when category is unavailable', async () => {
    productCategoryFindFirstMock.mockResolvedValue(null);

    const dto: CreateProductDto = {
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Es Kopi Susu',
      slug: 'es-kopi-susu',
    };

    await expect(service.createProduct(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(productCategoryFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: dto.categoryId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  });

  it('should reject activation without an active variant', async () => {
    productFindFirstMock.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      variants: [],
    });

    await expect(
      service.updateProduct('22222222-2222-4222-8222-222222222222', {
        status: ProductStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject image upload when product is unavailable', async () => {
    productFindFirstMock.mockResolvedValue(null);

    await expect(
      service.uploadProductImage(
        '22222222-2222-4222-8222-222222222222',
        {
          buffer: Buffer.from('test-image'),
        },
        {},
      ),
    ).rejects.toThrow('Product not found');
  });
});
