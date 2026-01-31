import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatutDemande } from '@prisma/client';

export class UpdateDemandeAdherentDto {
  @ApiProperty({ example: 'VALIDEE', enum: StatutDemande, required: false })
  @IsOptional()
  @IsEnum(StatutDemande)
  statut?: StatutDemande;
}
