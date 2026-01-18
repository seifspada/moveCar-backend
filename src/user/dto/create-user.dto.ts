import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MinLength, IsInt, IsPositive, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nom de l\'utilisateur',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'john@example.com',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @ApiProperty({
    description: 'Photo de profil de l\'utilisateur',
    example: '/uploads/photos/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({
    description: 'ID du rôle',
    example: 2,
  })
  @IsInt({ message: 'Le roleId doit être un nombre entier' })
  @IsPositive({ message: 'Le roleId doit être positif' })
  roleId: number;
}
