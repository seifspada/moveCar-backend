import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';

export class CreateAlerteGeographiqueDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  villeNom: string;

  @ApiProperty({ example: 48.8566 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 2.3522 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 50, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  rayon: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailActif?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushActif?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiProperty({ example: '2026-02-15', required: false })   // ✅ ajout
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @ApiProperty({ example: '2026-02-20', required: false })   // ✅ ajout
  @IsOptional()
  @IsString()
  dateDepartMax?: string;
}

export class CreateAlerteTrajetDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Paris' })
  @IsString()
  villeDepartNom: string;

  @ApiProperty({ example: 48.8566 })
  @IsNumber()
  latitudeDepart: number;

  @ApiProperty({ example: 2.3522 })
  @IsNumber()
  longitudeDepart: number;

  @ApiProperty({ example: 'Lyon' })
  @IsString()
  villeArriveeNom: string;

  @ApiProperty({ example: 45.7640 })
  @IsNumber()
  latitudeArrivee: number;

  @ApiProperty({ example: 4.8357 })
  @IsNumber()
  longitudeArrivee: number;

  @ApiProperty({ example: 30, minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  rayon: number;

  @ApiProperty({ example: '2026-02-15', required: false })
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @ApiProperty({ example: '2026-02-20', required: false })
  @IsOptional()
  @IsString()
  dateDepartMax?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailActif?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushActif?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}