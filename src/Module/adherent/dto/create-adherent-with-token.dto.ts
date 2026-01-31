import { IsNotEmpty, IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypePack } from '@prisma/client';

export class CreateAdherentWithTokenDto {
  @ApiProperty({ example: 'abc123xyz789', description: 'Token de validation' })
  @IsNotEmpty({ message: 'Le token est obligatoire' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'motdepasse123', description: 'Mot de passe (min 8 caractères)' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  motDePasse: string;

  @ApiProperty({ example: 'basic', enum: TypePack, description: 'Type de pack' })
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
