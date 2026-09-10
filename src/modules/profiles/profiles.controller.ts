import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Profiles')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
})
@Controller('Profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @ApiOperation({
    summary: 'Mengambil detail profil user yang sedang login',
  })
  @ApiOkResponse({
    description: 'Detail profil berhasil login',
  })
  @ApiNotFoundResponse({
    description: 'Profil user tidak ditemukan',
  })
  @Get('me')
  getMyProfile(@Req() request: AuthenticatedRequest) {
    return this.profilesService.findByUserId(request.user.id);
  }

  @ApiOperation({
    summary: 'Memperbarui profil user yang sedang login',
  })
  @ApiOkResponse({
    description: 'Profil berhasil diperbarui',
  })
  @ApiNotFoundResponse({
    description: 'Profil user tidak ditemukan',
  })
  @Patch('me')
  updateMyProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updatedByUserId(request.user.id, dto);
  }
}
