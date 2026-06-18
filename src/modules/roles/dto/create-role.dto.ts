import { IsString, IsOptional, IsNotEmpty, IsObject } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsObject()
  permisos?: Record<string, string[]>;
}
