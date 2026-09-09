import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token tidak tersedia, tidak valid, atau kadaluwarsa',
})
@ApiForbiddenResponse({
  description: 'User sudah login tetapi bukan admin',
})
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({
    summary: 'Membuat user baru',
  })
  @ApiCreatedResponse({
    description: 'User berhasil dibuat',
  })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @ApiOperation({
    summary: 'Mengambil seluruh user yang belum dihapus',
  })
  @ApiOkResponse({
    description: 'Daftar user berhasil diambil',
  })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @ApiOperation({
    summary: 'Mengambil user berdasarkan UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID User',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.findById(id);
  }
}
