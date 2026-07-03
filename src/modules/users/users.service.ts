import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUserDto) {
    const { fullName, roleId, ...userData } = dto;

    return this.prisma.user.create({
      data: {
        ...userData,
        role: {
          connect: {
            id: roleId,
          },
        },
        profile: fullName
          ? {
              create: {
                fullName,
              },
            }
          : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
