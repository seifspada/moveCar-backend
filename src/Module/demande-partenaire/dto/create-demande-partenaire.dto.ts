import { 
  IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, 
  IsInt, Min, MaxLength, IsDateString, Length, Matches 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { StatutEntreprise, TypeRendezvous } from '@prisma/client';
import { IsDateNotPast } from '../decorator/is-date-not-past.decorator';
import { IsValidTimeSlot } from '../decorator/is-valid-timeslot.decorator';
import { Match } from '../decorator/match.decorator';

export class CreateDemandePartenaireDto {
  // ========== Informations de contact ==========
  
  @ApiProperty({ example: 'Martin Dubois' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @IsString()
  @Length(2, 100, { message: 'Le nom doit contenir entre 2 et 100 caractères' })
  @Transform(({ value }) => value?.trim())
  nom: string;

  @ApiProperty({ example: 'Transport Express SARL' })
  @IsNotEmpty({ message: "L'entité est obligatoire" })
  @IsString()
  @Length(2, 150, { message: "L'entité doit contenir entre 2 et 150 caractères" })
  @Transform(({ value }) => value?.trim())
  entite: string;

  @ApiProperty({ 
    example: 'DIRECTEUR_GENERAL',
    enum: StatutEntreprise 
  })
  @IsNotEmpty({ message: "Le statut dans l'entreprise est obligatoire" })
  @IsEnum(StatutEntreprise, { message: 'Statut invalide' })
  statut: StatutEntreprise;

@ApiProperty({ example: '+3361234567' })
@IsNotEmpty({ message: 'Le téléphone est obligatoire' })
@Matches(/^((\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/, {
  message:
    'Numéro de téléphone invalide (format attendu : 0XXXXXXXXX ou +33XXXXXXXXX)',
})
telephone: string;


  @ApiProperty({ example: 'contact@transport-express.fr' })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: 'Format email invalide' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'contact@transport-express.fr' })
  @IsNotEmpty({ message: "La confirmation de l'email est obligatoire" })
  @IsEmail({}, { message: 'Format email invalide' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255)
  @Match('email', { message: 'Les emails ne correspondent pas' })
  confirmEmail: string;

  // ========== Renseignements optionnels ==========
  
  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsInt({ message: 'Le nombre de déplacements doit être un entier' })
  @Min(0, { message: 'Le nombre de déplacements ne peut pas être négatif' })
  nombreDeplacements?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsInt({ message: "Le nombre d'agences doit être un entier" })
  @Min(1, { message: "Le nombre d'agences doit être au moins 1" })
  nombreAgences?: number;

  // ========== Rendez-vous ==========
  
  @ApiProperty({ 
    example: 'TELEPHONIQUE',
    enum: TypeRendezvous 
  })
  @IsNotEmpty({ message: 'Le type de rendez-vous est obligatoire' })
  @IsEnum(TypeRendezvous, { message: 'Type de rendez-vous invalide' })
  typeRdv: TypeRendezvous;

   @ApiProperty({ example: '2026-02-15' })
  @IsNotEmpty({ message: 'La date du rendez-vous est obligatoire' })
  @IsDateString({}, { message: 'Format de date invalide (YYYY-MM-DD)' })
  @IsDateNotPast({ message: 'La date du rendez-vous ne peut pas être dans le passé' })
  dateRdv: string;

  // Créneau horaire
  @ApiProperty({ example: '09:00 - 09:30' })
  @IsNotEmpty({ message: 'Le créneau horaire est obligatoire' })
  @IsString()
  @IsValidTimeSlot({ message: 'Créneau horaire invalide' })
  creneau: string;
}
