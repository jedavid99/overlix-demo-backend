import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  contraseña: string;

  @IsNotEmpty()
  @IsString()
  codigo_empresa: string;
}
