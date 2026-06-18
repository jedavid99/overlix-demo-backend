import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

export enum SaleStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

export class UpdateSaleDto {
  @IsOptional()
  @IsEnum(SaleStatus)
  estado?: SaleStatus;

  @IsOptional()
  @IsString()
  direccion_entrega?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  [key: string]: any;
}
