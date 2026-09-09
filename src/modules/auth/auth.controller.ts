import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Mendaftarkan akun customer baru',
  })
  @ApiCreatedResponse({
    description: 'Akun berhasil dibuat dan access token dikembalikan',
  })
  @ApiConflictResponse({
    description: 'Email sudah terdaftar',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Login menggunakan email dan password',
  })
  @ApiOkResponse({
    description: 'Login berhasil dan access token dikembalikan',
  })
  @ApiUnauthorizedResponse({
    description: 'Email atau password salah, atau akun tidak aktif',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mengambil profil user yang sedang login',
  })
  @ApiOkResponse({
    description: 'Profil user berhasil diambil',
  })
  @ApiUnauthorizedResponse({
    description: 'Access token tidak tersedia valid atau sudah kadaluarsa',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.id);
  }
}
