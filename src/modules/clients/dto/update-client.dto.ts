import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['nombre_completo', 'telefono'] as const),
) {}
