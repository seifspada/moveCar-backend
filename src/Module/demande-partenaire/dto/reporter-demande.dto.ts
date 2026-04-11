// src/Module/demande-partenaire/dto/reporter-demande.dto.ts
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReporterDemandeDto {
  @ApiProperty({ example: '2026-05-15', description: 'Nouvelle date du rendez-vous' })
  @IsDateString()
  @IsNotEmpty()
  nouvelleDateRdv: string;

  @ApiProperty({ example: '10:00 - 10:30', description: 'Nouveau créneau horaire' })
  @IsString()
  @IsNotEmpty()
  nouveauCreneau: string;
}