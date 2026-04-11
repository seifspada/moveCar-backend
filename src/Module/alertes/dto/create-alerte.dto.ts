// src/Module/alertes/dto/create-alerte.dto.ts
import { ApiProperty } from '@nestjs/swagger'; // ✅ Importer
import { IsString, IsNumber, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateAlerteGeographiqueDto {
  @ApiProperty({ example: 1, description: 'ID de l\'utilisateur' }) // ✅
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Paris', description: 'Nom de la ville' }) // ✅
  @IsString()
  villeNom: string;

  @ApiProperty({ example: 48.8566, description: 'Latitude de la ville' }) // ✅
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 2.3522, description: 'Longitude de la ville' }) // ✅
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 50, description: 'Rayon en km', minimum: 1, maximum: 500 }) // ✅
  @IsInt()
  @Min(1)
  @Max(500)
  rayon: number;
}

export class CreateAlerteTrajetDto {
  @ApiProperty({ example: 1, description: 'ID de l\'utilisateur' })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'Paris', description: 'Ville de départ' })
  @IsString()
  villeDepartNom: string;

  @ApiProperty({ example: 48.8566 })
  @IsNumber()
  latitudeDepart: number;

  @ApiProperty({ example: 2.3522 })
  @IsNumber()
  longitudeDepart: number;

  @ApiProperty({ example: 'Lyon', description: 'Ville d\'arrivée' })
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

  @ApiProperty({ 
    example: '2026-02-15', 
    description: 'Date de départ souhaitée (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsString()
  dateDepart?: string;

  @ApiProperty({ 
    example: '2026-02-20', 
    description: 'Date de départ maximum (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsString()
  dateDepartMax?: string;
}
