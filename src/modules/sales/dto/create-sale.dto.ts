import { IsEmail, IsString, IsNotEmpty, IsNumber, IsArray, IsEnum, IsOptional, IsDate, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsNotEmpty()
  @IsString()
  producto_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_unitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento_linea?: number;
}

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum SalesChannel {
  LOCAL = 'local',
  WEB = 'web',
  MERCADOLIBRE = 'mercadolibre',
}

export class CreateSaleDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  fecha_venta: Date;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  impuestos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total: number;

  @IsNotEmpty()
  @IsString()
  metodo_pago_id: string;

  @IsOptional()
  @IsString()
  metodo_entrega_id?: string;

  @IsOptional()
  @IsString()
  direccion_entrega?: string;

  @IsOptional()
  @IsEnum(SalesChannel)
  canal_venta?: SalesChannel;

  @IsOptional()
  @IsString()
  referencia_externa?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
