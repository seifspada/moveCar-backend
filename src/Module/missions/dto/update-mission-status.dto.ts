import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

enum StatutMission {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDEE = 'VALIDEE',
  ANNULEE = 'ANNULEE',
}

export class UpdateMissionStatusDto {
  @IsEnum(StatutMission)
  @IsNotEmpty()
  statut: StatutMission;
}
