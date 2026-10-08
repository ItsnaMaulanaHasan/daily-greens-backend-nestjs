import { Injectable } from '@nestjs/common';
import { DiscountType, PromotionScope } from 'generated/prisma/enums';

export interface PromotionCalculationItem {
  categoryId: string;
  productId: string;
  variantId: string;
  quantity: number;
  lineTotal: number;
  isAvailable: boolean;
}

export interface PromotionCalculationRule {
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount: number | null;
  minimumOrderAmount: number | null;
  minimumQuantity: number | null;
  scope: PromotionScope;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  deletedAt: Date | null;
  categoryIds: string[];
  productIds: string[];
  variantIds: string[];
}

export interface PromotionCalculationResult {
  isEligible: boolean;
  ineligibleReason: string | null;
  eligibleSubtotal: number;
  discountAmount: number;
}

@Injectable()
export class PromotionCalculationService {
  calculate(
    promotion: PromotionCalculationRule,
    items: PromotionCalculationItem[],
  ): PromotionCalculationResult {
    const unavailableResult = (reason: string): PromotionCalculationResult => ({
      isEligible: false,
      ineligibleReason: reason,
      eligibleSubtotal: 0,
      discountAmount: 0,
    });

    const now = new Date();

    if (!promotion.isActive || promotion.deletedAt !== null) {
      return unavailableResult('Promotion is inactive');
    }

    if (now < promotion.startsAt) {
      return unavailableResult('Promotion has not started');
    }

    if (now > promotion.endsAt) {
      return unavailableResult('Promotion has expired');
    }

    const availableItems = items.filter((item) => item.isAvailable);

    if (availableItems.length === 0) {
      return unavailableResult('Cart has no available items');
    }

    const availableSubtotal = availableItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    );

    if (
      promotion.minimumOrderAmount !== null &&
      availableSubtotal < promotion.minimumOrderAmount
    ) {
      return unavailableResult(
        `Minimum order aomunt is ${promotion.minimumOrderAmount}`,
      );
    }

    const categoryIds = new Set(promotion.categoryIds);
    const productIds = new Set(promotion.productIds);
    const variantIds = new Set(promotion.variantIds);

    const eligibleItems = availableItems.filter((item) => {
      switch (promotion.scope) {
        case PromotionScope.ALL_PRODUCTS:
          return true;

        case PromotionScope.CATEGORY:
          return categoryIds.has(item.categoryId);

        case PromotionScope.PRODUCT:
          return productIds.has(item.productId);

        case PromotionScope.VARIANT:
          return variantIds.has(item.variantId);

        default:
          return false;
      }
    });

    if (eligibleItems.length === 0) {
      return unavailableResult(
        'Promotion does not apply to items in this cart',
      );
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    );

    const eligibleQuantity = eligibleItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    if (
      promotion.minimumQuantity !== null &&
      eligibleQuantity < promotion.minimumQuantity
    ) {
      return unavailableResult(
        `Minimum quantity is ${promotion.minimumQuantity}`,
      );
    }

    let discountAmount: number;

    if (promotion.discountType === DiscountType.PERCENTAGE) {
      discountAmount = eligibleSubtotal * (promotion.discountValue / 100);

      if (promotion.maximumDiscount !== null) {
        discountAmount = Math.min(discountAmount, promotion.maximumDiscount);
      }
    } else {
      discountAmount = Math.min(promotion.discountValue, eligibleSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      isEligible: true,
      ineligibleReason: null,
      eligibleSubtotal,
      discountAmount,
    };
  }
}
