import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
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

interface BufferedFile {
  buffer: Buffer;
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
    await this.ensureProfileExists(userId);

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

  async updateAvatar(userId: string, file: BufferedFile) {
    await this.ensureProfileExists(userId);

    let uploadResult;

    try {
      uploadResult = await this.cloudinaryService.uploadAvatar(file, userId);
    } catch {
      throw new BadGatewayException('Failed to upload avatar to Cloudinary');
    }

    return this.prisma.profile.update({
      where: {
        userId,
      },
      data: {
        avatarUrl: uploadResult.secure_url,
      },
      select: profileSelect,
    });
  }

  private async ensureProfileExists(userId: string): Promise<void> {
    const profile = await this.prisma.profile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
  }
}
