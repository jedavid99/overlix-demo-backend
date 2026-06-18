import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsNotEmpty, Min, MaxLength } from 'class-validator';

export enum ProductType {
  MODULO = 'modulo',
  BATERIA = 'bateria',
  ACCESORIO = 'accesorio',
  OTRO = 'otro',
}

export enum ProductStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  DESCONTINUADO = 'descontinuado',
}

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_producto?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  categoria_id?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_costo: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_venta: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_mayorista?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad_minima?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  compatibilidad?: any;

  @IsOptional()
  @IsString()
  imagen_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsNotEmpty()
  @IsEnum(ProductType)
  tipo_producto: ProductType;

  @IsOptional()
  @IsEnum(ProductStatus)
  estado?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  activo_en_ventas?: boolean;

  @IsOptional()
  @IsBoolean()
  activo_en_reparaciones?: boolean;
}
