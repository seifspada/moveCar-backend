import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, MaxLength, IsDateString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../decorators/match.decorator';


export class CreateDemandeDto {
  @ApiProperty({ example: 'Dupont' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @IsString()
  @Length(2, 100) 
  nom: string;


  @ApiProperty({ example: 'Jean' })
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @IsString()
  @Length(2, 100) 
  prenom: string;


  @ApiProperty({ example: '1990-05-15' })
  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString()
  dateNaissance: string;


  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(255) 
  email: string;


  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsNotEmpty({ message: "La confirmation d'email est obligatoire" })
  @IsEmail({}, { message: 'Email de confirmation invalide' })
  @Match('email', { message: 'Les emails ne correspondent pas' })
  @MaxLength(255) 
  confirmEmail: string;


  @ApiProperty({ example: 'Paris' })
  @IsNotEmpty({ message: 'La ville est obligatoire' })
  @IsString()
  @Length(2, 100) 
  ville: string;


  @ApiProperty({ example: '123 Rue de la Paix' })
  @IsNotEmpty({ message: "L'adresse est obligatoire" })
  @IsString()
  @MaxLength(500) 
  adresse: string;


  @ApiProperty({ example: '0612345678' })
  @IsNotEmpty({ message: 'Le téléphone est obligatoire' })
  @Matches(/^0[1-9]\d{8}$/, { message: 'Numéro de téléphone invalide' })
  telephone: string;


  @ApiProperty({ example: 'Garage Auto Express SARL' })
  @IsNotEmpty({ message: 'La raison sociale est obligatoire' })
  @IsString()
  @MaxLength(255)
  raisonSociale: string;


  @ApiProperty({ example: '123456789' })
  @IsNotEmpty({ message: 'Le numéro KBIS est obligatoire' })
  @IsString()
  @MaxLength(50)
  numeroKbis: string;


  @ApiProperty({ example: 'AB123456' })
  @IsNotEmpty({ message: 'Le numéro de permis est obligatoire' })
  @IsString()
  @MaxLength(50)
  numeroPermis: string;


  @ApiProperty({ example: '2020-03-10' })
  @IsNotEmpty({ message: 'La date de délivrance est obligatoire' })
  @IsDateString()
  dateDelivrance: string;


  @ApiProperty({ example: 'B' })
  @IsNotEmpty({ message: 'Le type de permis est obligatoire' })
  @IsString()
  @MaxLength(10)
  typePermis: string;
}
