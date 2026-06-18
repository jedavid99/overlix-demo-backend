import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyCompanyDto {
  @IsNotEmpty()
  @IsString()
  codigo_empresa: string;
}
