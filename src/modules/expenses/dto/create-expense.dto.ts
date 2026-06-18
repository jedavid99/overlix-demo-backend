import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty, IsDateString, Min, MaxLength } from 'class-validator';

export enum ExpenseStatus {
  REGISTRADO = 'registrado',
  PAGADO = 'pagado',
  RECHAZADO = 'rechazado',
}

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  categoria_gasto_id?: string;

  @IsNotEmpty()
  @IsString()
  descripcion: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  monto: number;

  @IsOptional()
  @IsString()
  metodo_pago_id?: string;

  @IsNotEmpty()
  @IsDateString()
  fecha_gasto: string;

  @IsOptional()
  @IsDateString()
  fecha_pago?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  comprobante_numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  proveedor?: string;

  @IsOptional()
  @IsString()
  proveedor_id?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  estado?: ExpenseStatus;

  @IsOptional()
  @IsString()
  notas?: string;
}
