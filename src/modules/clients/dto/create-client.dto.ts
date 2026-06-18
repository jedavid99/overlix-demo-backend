import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, Matches } from 'class-validator';

export enum ClientType {
  PARTICULAR = 'particular',
  EMPRESA = 'empresa',
  MAYORISTA = 'mayorista',
}

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  nombre_completo: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'El teléfono debe tener al menos 10 caracteres' })
  telefono: string;

  @IsOptional()
  @IsString()
  telefono_secundario?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7,11}$/, { message: 'DNI debe tener entre 7 y 11 dígitos' })
  dni?: string;

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
  @IsEnum(ClientType)
  tipo_cliente?: ClientType;

  @IsOptional()
  @IsString()
  notes?: string;
}
