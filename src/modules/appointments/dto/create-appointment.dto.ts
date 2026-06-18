import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty, IsDateString, Min, MaxLength, IsBoolean } from 'class-validator';

export enum AppointmentType {
  DIAGNOSTIC = 'diagnostic',
  REPARACION = 'reparacion',
  ENTREGA = 'entrega',
  CONSULTA = 'consulta',
  MANTENIMIENTO = 'mantenimiento',
}

export enum AppointmentStatus {
  PROGRAMADA = 'programada',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
  NO_ASISTIO = 'no_asistio',
}

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsOptional()
  @IsString()
  tecnico_id?: string;

  @IsNotEmpty()
  @IsEnum(AppointmentType)
  tipo_cita: AppointmentType;

  @IsNotEmpty()
  @IsDateString()
  fecha_cita: string;

  @IsNotEmpty()
  @IsString()
  hora_cita: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  duracion_minutos?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  reparacion_id?: string;

  @IsOptional()
  @IsString()
  venta_id?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  estado?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notas?: string;
}
