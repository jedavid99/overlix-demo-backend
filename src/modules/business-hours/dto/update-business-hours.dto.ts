import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';

export enum DayOfWeek {
  LUNES = 'lunes',
  MARTES = 'martes',
  MIERCOLES = 'miercoles',
  JUEVES = 'jueves',
  VIERNES = 'viernes',
  SABADO = 'sabado',
  DOMINGO = 'domingo',
}

export class UpdateBusinessHoursDto {
  @IsOptional()
  @IsEnum(DayOfWeek)
  dia_semana?: DayOfWeek;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  hora_apertura?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  hora_cierre?: string;

  @IsOptional()
  @IsBoolean()
  abierto?: boolean;

  @IsOptional()
  @IsString()
  descanso_inicio?: string;

  @IsOptional()
  @IsString()
  descanso_fin?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
