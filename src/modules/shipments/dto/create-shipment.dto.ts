import { IsString, IsOptional, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';

export enum ShipmentStatus {
  PENDIENTE = 'pendiente',
  EN_TRANSITO = 'en_transito',
  ENTREGADO = 'entregado',
  DEVUELTO = 'devuelto',
  CANCELADO = 'cancelado',
}

export class CreateShipmentDto {
  @IsOptional()
  @IsString()
  venta_id?: string;

  @IsOptional()
  @IsString()
  cliente_id?: string;

  @IsNotEmpty()
  @IsString()
  direccion_envio: string;

  @IsNotEmpty()
  @IsString()
  ciudad: string;

  @IsNotEmpty()
  @IsString()
  provincia: string;

  @IsNotEmpty()
  @IsString()
  codigo_postal: string;

  @IsNotEmpty()
  @IsString()
  pais: string;

  @IsNotEmpty()
  @IsString()
  transportista: string;

  @IsOptional()
  @IsString()
  numero_seguimiento?: string;

  @IsNotEmpty()
  @IsDateString()
  fecha_envio: string;

  @IsOptional()
  @IsDateString()
  fecha_estimada_entrega?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  estado?: ShipmentStatus;

  @IsOptional()
  @IsString()
  notas?: string;
}
