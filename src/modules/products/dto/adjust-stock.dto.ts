import { IsNumber, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-999999)
  cantidad: number; // Positivo para agregar, negativo para restar

  @IsOptional()
  @IsString()
  motivo?: string;
}
