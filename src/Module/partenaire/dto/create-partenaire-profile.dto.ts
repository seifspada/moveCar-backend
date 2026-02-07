import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartenaireProfileDto {
  @ApiProperty({ example: 'Martin Dubois' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom: string;

  @ApiProperty({ example: 'Transport Express SARL' })
  @IsString()
  @IsNotEmpty({ message: "L'entité est obligatoire" })
  @MinLength(2, { message: "L'entité doit contenir au moins 2 caractères" })
  entite: string;

  @ApiProperty({ example: '+33612345678' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  @IsString()
  telephone: string;

  @ApiProperty({ example: 'contact@transport-express.fr' })
  @IsEmail({}, { message: 'Format email invalide' })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;

  @ApiProperty({ example: '12 Rue de Paris', required: false })
  @IsOptional()
  @IsString()
  adresseAgence?: string;

  @ApiProperty({ example: 'Paris', required: false })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiProperty({ example: 'Motdepasse123!' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  motDePasse: string;
}
