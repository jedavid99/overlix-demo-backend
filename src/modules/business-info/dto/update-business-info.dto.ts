import { IsString, IsOptional, IsNotEmpty, IsObject, IsEmail } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre_negocio?: string;

  @IsOptional()
  @IsString()
  propietario_nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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

  @IsOptional()
  @IsString()
  sitio_web?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsObject()
  horarios?: Record<string, any>;
}
