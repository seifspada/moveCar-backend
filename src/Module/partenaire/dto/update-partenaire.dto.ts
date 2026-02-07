import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePartenaireDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  entite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresseAgence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ville?: string;
}
