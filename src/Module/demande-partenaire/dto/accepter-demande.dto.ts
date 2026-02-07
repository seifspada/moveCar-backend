import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

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
}