import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDate, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum RepairStatus {
  DIAGNOSTIC = 'diagnostic',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  TESTING = 'testing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RepairPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateRepairDto {
  @IsNotEmpty()
  @IsUUID()
  cliente_id: string;

  @IsNotEmpty()
  @IsString()
  dispositivo: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  numero_serie?: string;

  @IsNotEmpty()
  @IsString()
  problema_reportado: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  fecha_ingreso: Date;

  @IsOptional()
  @IsEnum(RepairPriority)
  prioridad?: RepairPriority;

  @IsOptional()
  @IsUUID()
  tecnico_asignado_id?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_estimada_entrega?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempo_estimado_minutos?: number;
}
