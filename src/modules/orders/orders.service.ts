import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OrderType, PaymentMethod } from 'generated/prisma/enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const timestamp = new Date().toISOString().replace(/\D/g, '').toUpperCase();

    const randomPart = randomBytes(3).toString('hex').toUpperCase();

    return `DG-${timestamp}-${randomPart}`;
  }
}
