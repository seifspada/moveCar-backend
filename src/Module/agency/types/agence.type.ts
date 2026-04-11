import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgenceType {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Agence Tunis Centre' })
  nom: string;

  @ApiPropertyOptional({ example: 'Rue de la Liberté, Tunis' })
  adresse?: string | null;

  @ApiPropertyOptional({ example: 'Tunis' })
  ville?: string | null;

  @ApiPropertyOptional({ example: '1000' })
  codePostal?: string | null;

  @ApiPropertyOptional({ example: '+21671000000' })
  telephone?: string | null;

  @ApiPropertyOptional({ example: 'tunis.centre@agency.com' })
  email?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  partenaireId: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
