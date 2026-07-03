import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  passwordHash: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;
}
