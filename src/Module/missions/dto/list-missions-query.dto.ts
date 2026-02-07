import { IsOptional, IsString, IsEnum } from 'class-validator';

enum StatutMission {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDEE = 'VALIDEE',
  ANNULEE = 'ANNULEE',
}

export class ListMissionsQueryDto {
  @IsOptional()
  @IsString()
  partenaireId?: string;

  @IsOptional()
  @IsEnum(StatutMission)
  statut?: StatutMission;
}
