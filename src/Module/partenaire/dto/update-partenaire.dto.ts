import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePartenaireDto {
  @ApiPropertyOptional({ example: 'Martin' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nom?: string;

  @ApiPropertyOptional({ example: 'Dubois' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  prenom?: string;

  @ApiPropertyOptional({ example: 'Groupe TransExpress' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  entiteGroupe?: string;

  @ApiPropertyOptional({ example: 'Agence Paris 12' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  entiteAgence?: string;

  @ApiPropertyOptional({ example: '+33612345678' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: 'contact@transport-express.fr' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '12 Rue de Paris' })
  @IsOptional()
  @IsString()
  adresseAgence?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  ville?: string;
}
