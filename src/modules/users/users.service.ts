import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { CreateUserDto } from './dto/create-user.dto';

const publicUserSelect = {
  id: true,
  email: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  profile: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateUserDto) {
    const { fullName, roleId, password, ...userData } = dto;

    const passwordHash = await this.passwordService.hash(password);

    return this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
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
      select: publicUserSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: publicUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: publicUserSelect,
    });
  }
}
