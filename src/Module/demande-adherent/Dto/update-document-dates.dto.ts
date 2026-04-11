// src/demande-adherent/Dto/update-document-dates.dto.ts

import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDocumentDatesDto {
  @ApiProperty({
    example: '2026-01-01',
    description: 'Date de début de validité (ISO 8601 — YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateDebutValidite?: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Date de fin de validité (ISO 8601 — YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFinValidite?: string;
}