import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AccepterDemandeDto {
  @ApiProperty({
    description: 'Date de signature du contrat',
    example: '2026-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  dateSignature: string;

  @ApiProperty({
    description: 'Date de fin du contrat',
    example: '2027-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  dateFinContrat: string;

  @ApiPropertyOptional({
    description: 'Notes internes sur le contrat',
  })
  @IsString()
  @IsOptional()
  notesInternes?: string;

  // ✅ Nouveaux champs tarifaires

  @ApiPropertyOptional({
    description: 'Prix par kilomètre (€/km)',
    example: 0.45,
    type: Number,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Type(() => Number)
  prixParKm?: number;

  @ApiPropertyOptional({
    description: 'Kilométrage autorisé avant dépassement facturé (km)',
    example: 300,
    type: Number,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  depassementKilometrage?: number;

  @ApiPropertyOptional({
    description: 'Pénalité pour retard sans avertissement (€/heure)',
    example: 25.0,
    type: Number,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  retardSansAvertissement?: number;

  @ApiPropertyOptional({
    description: 'Frais de restitution à un autre endroit (€/heure)',
    example: 50.0,
    type: Number,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  restitutionAutreEndroit?: number;
}