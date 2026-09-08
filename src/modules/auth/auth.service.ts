import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordService } from './password.service';

const publicUserSelect = {
  id: true,
  email: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
    },
  },
  role: {
    select: {
      name: true,
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email is already resgistered');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: {
        name: 'customer',
      },
      select: {
        id: true,
      },
    });

    if (!customerRole) {
      throw new InternalServerErrorException(
        'Customer role is not configured. Run the database seeder first.',
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          roleId: customerRole.id,
          profile: {
            create: {
              fullName: dto.fullName,
            },
          },
        },
        select: publicUserSelect,
      });

      return this.createAuthResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const userWithPassword = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });

    if (
      userWithPassword?.status !== UserStatus.ACTIVE ||
      userWithPassword?.deletedAt
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.verify(
      userWithPassword.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.update({
      where: {
        email: dto.email,
      },
      data: {
        lastLoginAt: new Date(),
      },
      select: publicUserSelect,
    });

    return this.createAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: publicUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('User is no longer active');
    }

    return user;
  }

  private async createAuthResponse(user: {
    id: string;
    email: string;
    role: {
      name: string;
    };
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      user,
    };
  }
}
