import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class CompleteProfileDto {
  @ApiProperty({ example: 'Azerty123!', description: 'Mot de passe' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Azerty123!', description: 'Confirmation mot de passe' })
  @IsString()
  confirmPassword: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiPropertyOptional({ example: '+21621000000' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: 'Rue de la paix' })
  @IsOptional()
  @IsString()
  adresseAgence?: string;

  @ApiPropertyOptional({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Photo de profil' })
  @IsOptional()
  photo?: any;
}
