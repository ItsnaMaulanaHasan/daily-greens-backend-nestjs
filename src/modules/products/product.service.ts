import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  StockMovementType,
} from '../../../generated/prisma/client';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';

interface BufferedFile {
  buffer: Buffer;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    try {
      return await this.prisma.productCategory.update({
        where: {
          id,
          deletedAt: null,
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
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name or slug is already in use');
      }

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

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        variants: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId) {
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
    }

    if (dto.status === ProductStatus.ACTIVE && product.variants.length === 0) {
      throw new BadRequestException(
        'Product cannot be activated without an active variant',
      );
    }

    try {
      return await this.prisma.product.update({
        where: {
          id,
          deletedAt: null,
        },
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

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Product not found');
      }

      throw error;
    }
  }

  async removeProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        status: ProductStatus.ARCHIVED,
        deletedAt: new Date(),
      },
    });
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

  // variant produk
  async createProductVariant(
    productId: string,
    createdBy: string,
    dto: CreateProductVariantDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
        options: {
          select: {
            id: true,
            displayName: true,
            isRequired: true,
            values: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          },
        },
        variants: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            optionValues: {
              select: {
                optionValueId: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const optionValueIds = dto.optionValueIds ?? [];

    const availableOptionValues = product.options.flatMap((option) =>
      option.values.map((value) => ({
        id: value.id,
        optionId: option.id,
      })),
    );

    const selectedOptionValues = optionValueIds.map((optionValueId) =>
      availableOptionValues.find((value) => value.id === optionValueId),
    );

    if (selectedOptionValues.includes(undefined)) {
      throw new BadRequestException(
        'One or more option values do not belong to this product or are inactive',
      );
    }

    const selectedOptionIds = selectedOptionValues.map(
      (value) => value?.optionId,
    );

    if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
      throw new BadRequestException(
        'Only one value may be selected from each product option',
      );
    }

    const missingRequiredOption = product.options.find(
      (option) => option.isRequired && !selectedOptionIds.includes(option.id),
    );

    if (missingRequiredOption) {
      throw new BadRequestException(
        `Option "${missingRequiredOption.displayName}" is required`,
      );
    }

    const combinationKey = [...optionValueIds].sort().join(':');

    const duplicateCombination = product.variants.some((variant) => {
      const existingCombinationKey = variant.optionValues
        .map((item) => item.optionValueId)
        .sort()
        .join(':');
      return existingCombinationKey === combinationKey;
    });

    if (duplicateCombination) {
      throw new ConflictException(
        'A variant with the same option combination already exists',
      );
    }

    const initialStock = dto.stock ?? 0;
    const shouldBeDefault =
      product.variants.length === 0 || dto.isDefault === true;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (shouldBeDefault) {
          await transaction.productVariant.updateMany({
            where: {
              productId,
              deletedAt: null,
            },
            data: {
              isDefault: false,
            },
          });
        }

        return transaction.productVariant.create({
          data: {
            productId,
            sku: dto.sku,
            name: dto.name,
            price: dto.price,
            costPrice: dto.costPrice,
            stock: initialStock,
            trackStock: dto.trackStock,
            isDefault: shouldBeDefault,
            isActive: dto.isActive,
            optionValues: {
              create: optionValueIds.map((optionValueId) => ({
                optionValueId,
              })),
            },
            stockMovements:
              initialStock > 0
                ? {
                    create: {
                      type: StockMovementType.RESTOCK,
                      quantityChange: initialStock,
                      stockBefore: 0,
                      stockAfter: initialStock,
                      note: 'Initial stock',
                      createdBy,
                    },
                  }
                : undefined,
          },
          include: {
            optionValues: {
              include: {
                optionValue: {
                  include: {
                    option: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Variant SKU is already in use');
      }

      throw error;
    }
  }

  async updateProductVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        deletedAt: null,
        product: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        isDefault: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.isDefault && dto.isDefault === false) {
      throw new BadRequestException(
        'The default variant cannot be unset directly; set another variant as default instead',
      );
    }

    if (variant.isDefault && dto.isActive === false) {
      throw new BadRequestException(
        'The default variant cannot be deactivated; set another variant as default first',
      );
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (dto.isDefault === true) {
          await transaction.productVariant.updateMany({
            where: {
              productId,
              deletedAt: null,
              id: {
                not: variantId,
              },
            },
            data: {
              isDefault: false,
            },
          });
        }

        return transaction.productVariant.update({
          where: {
            id: variantId,
            productId,
            deletedAt: null,
          },
          data: {
            sku: dto.sku,
            name: dto.name,
            price: dto.price,
            costPrice: dto.costPrice,
            trackStock: dto.trackStock,
            isDefault: dto.isDefault,
            isActive: dto.isActive,
          },
          include: {
            optionValues: {
              include: {
                optionValue: {
                  include: {
                    option: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Variant SKU is already in use');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Product variant not found');
      }

      throw error;
    }
  }

  // product query
  async findAllPublicProducts(query: ProductQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      category: {
        is: {
          isActive: true,
          deletedAt: null,
          ...(query.categorySlug ? { slug: query.categorySlug } : {}),
        },
      },
      variants: {
        some: {
          isActive: true,
          deletedAt: null,
        },
      },
      ...(query.search
        ? {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.isFeatured !== undefined
        ? {
            isFeatured: query.isFeatured,
          }
        : {}),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          allowCustomerNote: true,
          notePlaceholder: true,
          preparationTimeMinutes: true,
          isFeatured: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: {
              id: true,
              imageUrl: true,
              altText: true,
              isPrimary: true,
            },
          },
          variants: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: [{ isDefault: 'desc' }, { price: 'asc' }],
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              stock: true,
              trackStock: true,
              isDefault: true,
              optionValues: {
                select: {
                  optionValue: {
                    select: {
                      id: true,
                      value: true,
                      label: true,
                      option: {
                        select: {
                          id: true,
                          name: true,
                          displayName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      data: products,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        category: {
          is: {
            isActive: true,
            deletedAt: null,
          },
        },
        variants: {
          some: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        allowCustomerNote: true,
        notePlaceholder: true,
        preparationTimeMinutes: true,
        isFeatured: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          select: {
            id: true,
            imageUrl: true,
            altText: true,
            position: true,
            isPrimary: true,
          },
        },
        options: {
          orderBy: [{ position: 'asc' }, { displayName: 'asc' }],
          select: {
            id: true,
            name: true,
            displayName: true,
            isRequired: true,
            position: true,
            values: {
              where: {
                isActive: true,
              },
              orderBy: [{ position: 'asc' }, { label: 'asc' }],
              select: {
                id: true,
                value: true,
                label: true,
                position: true,
              },
            },
          },
        },
        variants: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: [{ isDefault: 'desc' }, { price: 'asc' }],
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            stock: true,
            trackStock: true,
            isDefault: true,
            optionValues: {
              select: {
                optionValue: {
                  select: {
                    id: true,
                    value: true,
                    label: true,
                    option: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // product image
  async uploadProductImage(
    productId: string,
    file: BufferedFile,
    dto: UploadProductImageDto,
  ) {
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

    const imageCount = await this.prisma.productImage.count({
      where: {
        id: productId,
        deletedAt: null,
      },
    });

    if (imageCount >= 5) {
      throw new ConflictException(
        'A product can have a maximum of five images',
      );
    }

    let uploadResult;

    try {
      uploadResult = await this.cloudinaryService.uploadProductImage(
        file,
        productId,
      );
    } catch {
      throw new BadGatewayException(
        'Failed to upload product image to Cloudinary',
      );
    }

    const shouldBePrimary = imageCount === 0 || dto.isPrimary === true;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (shouldBePrimary) {
          await transaction.productImage.updateMany({
            where: {
              productId,
              deletedAt: null,
            },
            data: {
              isPrimary: false,
            },
          });
        }

        return transaction.productImage.create({
          data: {
            productId,
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            altText: dto.altText,
            position: dto.position,
            isPrimary: shouldBePrimary,
          },
        });
      });
    } catch (error) {
      await this.cloudinaryService
        .deleteImage(uploadResult.public_id)
        .catch(() => undefined);

      throw error;
    }
  }

  async removeProductImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
        deletedAt: null,
        product: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        publicId: true,
        isPrimary: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    try {
      await this.cloudinaryService.deleteImage(imageId);
    } catch {
      throw new BadGatewayException(
        'Failed to delete product image from cloudinary',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const deletedImage = await transaction.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          isPrimary: false,
          deletedAt: new Date(),
        },
      });

      if (image.isPrimary) {
        const nextPrimaryImage = await transaction.productImage.findFirst({
          where: {
            productId,
            deletedAt: null,
          },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
          },
        });

        if (nextPrimaryImage) {
          await transaction.productImage.update({
            where: {
              id: nextPrimaryImage.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }

      return deletedImage;
    });
  }

  // product stock
  async adjustProductVariantStock(
    productId: string,
    variantId: string,
    createdBy: string,
    dto: AdjustProductStockDto,
  ) {
    if (dto.type !== StockMovementType.ADJUSTMENT && dto.quantityChange < 0) {
      throw new BadRequestException(
        'Only ADJUSTMENT may use a negative quantity change',
      );
    }

    if (dto.type === StockMovementType.ADJUSTMENT && !dto.note?.trim()) {
      throw new BadRequestException(
        'A note is required for a stock adjustment',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.findFirst({
        where: {
          id: variantId,
          productId,
          deletedAt: null,
          product: {
            is: {
              deletedAt: null,
            },
          },
        },
        select: {
          id: true,
          sku: true,
          name: true,
          trackStock: true,
        },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      if (!variant.trackStock) {
        throw new BadRequestException(
          'Stock tracking is disabled for this variant',
        );
      }

      const updateResult = await transaction.productVariant.updateMany({
        where: {
          id: variantId,
          productId,
          deletedAt: null,
          ...(dto.quantityChange < 0
            ? {
                stock: {
                  gte: Math.abs(dto.quantityChange),
                },
              }
            : {}),
        },
        data: {
          stock: {
            increment: dto.quantityChange,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('Insuffient stock for this adjustment');
      }

      const updateVariant = await transaction.productVariant.findUniqueOrThrow({
        where: {
          id: variantId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
        },
      });

      const stockBefore = updateVariant.stock - dto.quantityChange;

      const stockMovement = await transaction.stockMovement.create({
        data: {
          variantId,
          type: dto.type,
          quantityChange: dto.quantityChange,
          stockBefore,
          stockAfter: updateVariant.stock,
          note: dto.note?.trim(),
          createdBy,
        },
      });

      return {
        variant: updateVariant,
        stockMovement,
      };
    });
  }
}
