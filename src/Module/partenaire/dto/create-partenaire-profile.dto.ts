import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartenaireProfileDto {
  @ApiProperty({ example: 'Martin' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  nom: string;

  @ApiProperty({ example: 'Dubois' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  prenom: string;

  @ApiProperty({ example: 'Groupe TransExpress' })
  @IsString()
  @IsNotEmpty({ message: "L'entité groupe est obligatoire" })
  @MinLength(2, { message: "L'entité groupe doit contenir au moins 2 caractères" })
  entiteGroupe: string;

  @ApiProperty({ example: 'Agence Paris 12' })
  @IsString()
  @IsNotEmpty({ message: "L'entité agence est obligatoire" })
  @MinLength(2, { message: "L'entité agence doit contenir au moins 2 caractères" })
  entiteAgence: string;

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

  // ✅ AJOUTÉ — même pattern que CreateAdherentProfileDto
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Photo de profil (JPG/PNG/WEBP, max 5MB)',
    required: false,
  })
  @IsOptional()
  photo?: any;
}