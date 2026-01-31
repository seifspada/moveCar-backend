import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypePack } from '@prisma/client';

export class CreateAdherentDto {
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  motDePasse: string;

  @ApiProperty({ example: 'basic', enum: TypePack })
  @IsNotEmpty({ message: 'Le pack est obligatoire' })
  @IsEnum(TypePack)
  typePack: TypePack;

  @ApiProperty({ 
    type: 'string', 
    format: 'binary', 
    description: 'Photo de profil (JPG/PNG/WEBP, max 5MB)' 
  })
  photo: any;
}
