import { IsEmail, IsString, MinLength, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  nombre_empresa: string;

  @IsNotEmpty()
  @IsString()
  razon_social: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11,13}$/, { message: 'CUIT debe tener entre 11 y 13 dígitos' })
  cuit?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contraseña: string;

  @IsNotEmpty()
  @IsString()
  nombre_completo: string;

  @IsNotEmpty()
  @IsString()
  telefono: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  codigo_postal?: string;
}
