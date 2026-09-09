import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  address: true,
  phoneNumber: true,
  birthDate: true,
  gender: true,
  user: {
    select: {
      id: true,
      email: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: {
        userId,
      },
      select: profileSelect,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updatedByUserId(userId: string, dto: UpdateProfileDto) {
    const existingProfile = await this.prisma.profile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingProfile) {
      throw new NotFoundException('Profile not found');
    }

    return this.prisma.profile.update({
      where: {
        userId,
      },
      data: {
        fullName: dto.fullName,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        birthDate: dto.birthDate,
        gender: dto.gender,
      },
      select: profileSelect,
    });
  }
}
