import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface UploadedAvatarFile {
  buffer: Buffer;
}

@ApiTags('Profiles')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
})
@Controller('profiles')
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

  @ApiOperation({
    summary: 'Mengunggah atau mengganti foto profil',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'File JPG, PNG, atau WebP dengan ukuran maksimal 2 MB',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Avatar berhasil diunggah dan profil diperbarui',
  })
  @ApiNotFoundResponse({
    description: 'Profile user tidak ditemukan',
  })
  @ApiUnprocessableEntityResponse({
    description: 'File tidak tersedia atau format file tidak didukung',
  })
  @ApiPayloadTooLargeResponse({
    description: 'Gagal mengunggah avatar ke Cloudinary',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @Patch('me/avatar')
  updateMyAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: UploadedAvatarFile,
  ) {
    return this.profilesService.updateAvatar(request.user.id, file);
  }
}
