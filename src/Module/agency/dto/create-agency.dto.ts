import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateAgencyDto {

  // entiteAgence → nom de l'agence
  @IsString()
  @MaxLength(150)
  nom: string;

  // 🔴 FIX: Ajout entiteGroupe manquant
  @IsOptional()
  @IsString()
  @MaxLength(150)
  entiteGroupe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codePostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
