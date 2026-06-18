import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { user_status } from '../../../common/enums/user-status.enum';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  contraseña: string;

  @IsNotEmpty()
  @IsString()
  nombre_completo: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsEnum(user_status)
  estado?: user_status;

  @IsNotEmpty()
  @IsString()
  rol_id: string;
}
