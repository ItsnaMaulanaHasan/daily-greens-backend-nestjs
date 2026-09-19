import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // product category
  async createCategory(dto: CreateProductCategoryDto) {
    try {
      return await this.prisma.productCategory.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          imageUrl: dto.imageUrl,
          position: dto.position,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name or slug is already in use');
      }

      throw error;
    }
  }

  findAllActiveCategories() {
    return this.prisma.productCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        position: true,
      },
      orderBy: [{ position: 'desc' }, { name: 'asc' }],
    });
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    try {
      return await this.prisma.productCategory.update({
        where: {
          id,
        },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          imageUrl: dto.imageUrl,
          position: dto.position,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Product category not found');
      }

      throw error;
    }
  }

  async removeCategory(id: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    const productCount = await this.prisma.product.count({
      where: {
        categoryId: id,
        deletedAt: null,
      },
    });

    if (productCount > 0) {
      throw new ConflictException(
        'Product category cannot be deleted while it still has products',
      );
    }

    return this.prisma.productCategory.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  // product
  async createProduct(dto: CreateProductDto) {
    const category = await this.prisma.productCategory.findFirst({
      where: {
        id: dto.categoryId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Product category not found or inactive');
    }

    try {
      return await this.prisma.product.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status,
          allowCustomerNote: dto.allowCustomerNote,
          notePlaceholder: dto.notePlaceholder,
          preparationTimeMinutes: dto.preparationTimeMinutes,
          isFeatured: dto.isFeatured,
          position: dto.position,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Product slug is already in use');
      }

      throw error;
    }
  }

  // product option
  async createProductOption(productId: string, dto: CreateProductOptionDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    try {
      return await this.prisma.productOption.create({
        data: {
          productId,
          name: dto.name,
          displayName: dto.displayName,
          isRequired: dto.isRequired,
          position: dto.position,
          values: {
            create: dto.values.map((optionValue) => ({
              value: optionValue.value,
              label: optionValue.label,
              position: optionValue.position,
              isActive: optionValue.isActive,
            })),
          },
        },
        include: {
          values: {
            orderBy: [{ position: 'asc' }, { label: 'asc' }],
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Option name or option value is already in use for this product',
        );
      }

      throw error;
    }
  }
}
