import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TypePack } from '@prisma/client';

export class UpdateAdherentDto {
  @ApiProperty({ required: false, example: 'Dupont' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiProperty({ required: false, example: 'Jean' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ required: false, example: '+33123456789' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ required: false, example: 'Paris' })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiProperty({ required: false, example: 'premium', enum: TypePack })
  @IsOptional()
  @IsEnum(TypePack)
  typePack?: TypePack;

  @ApiProperty({ required: false, example: 'newPassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  motDePasse?: string;

  @ApiProperty({ required: false, description: 'Photo de profil' })
  @IsOptional()
  photo?: any;
}
