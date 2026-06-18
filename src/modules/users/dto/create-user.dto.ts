import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsUUID()
  company_id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsOptional()
  @IsUUID()
  role_id?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
