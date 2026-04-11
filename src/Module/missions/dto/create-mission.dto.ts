import { 
  IsString, 
  IsNotEmpty, 
  IsInt, 
  IsDateString, 
  IsOptional, 
  IsBoolean,
  Min,
  Max,
  Length,
  Matches
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMissionDto {
@ApiProperty({ 
  example: 1,
  description: 'ID de l\'agent',  // ✅ Remplacé
  type: Number
})
@Transform(({ value }) => {
  if (value == null) {
    throw new Error('agentId est requis');  // ✅ Remplacé
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error('agentId doit être un nombre valide');  // ✅ Remplacé
    }
    return parsed;
  }
  
  throw new Error('agentId doit être un nombre');  // ✅ Remplacé
})
@IsInt()
@Type(() => Number)
agentId: number;  // ✅ Déjà correct

  // ==================== ADRESSE DÉPART ====================
  @ApiProperty({ 
    example: 'Paris',
    description: 'Nom de la ville de départ'
  })
  @IsString()
  @IsNotEmpty()
  villeDepart: string;

  @ApiProperty({ 
    example: '15 Avenue des Champs-Élysées, 75008 Paris',
    description: 'Adresse complète de départ'
  })
  @IsString()
  @IsNotEmpty()
  adresseDepartComplete: string;

  @ApiProperty({ 
    example: 'ENTREPRISE',
    description: 'Type de lieu de départ',
    enum: ['DOMICILE', 'ENTREPRISE', 'HOTEL', 'GARE', 'AEROPORT', 'AGENCE', 'CONCESSION', 'PARTICULIER', 'PARC_AUTO', 'AUTRE']
  })
  @IsString()
  @IsNotEmpty()
  typeLieuDepart: string;

  @ApiPropertyOptional({ 
    example: 'Siège Social ABC',
    description: 'Nom du lieu de départ'
  })
  @IsString()
  @IsOptional()
  nomLieuDepart?: string;

  // ==================== ADRESSE ARRIVÉE ====================
  @ApiProperty({ 
    example: 'Lyon',
    description: 'Nom de la ville d\'arrivée'
  })
  @IsString()
  @IsNotEmpty()
  villeArrivee: string;

  @ApiProperty({ 
    example: '10 Place Bellecour, 69002 Lyon',
    description: 'Adresse complète d\'arrivée'
  })
  @IsString()
  @IsNotEmpty()
  adresseArriveeComplete: string;

  @ApiProperty({ 
    example: 'HOTEL',
    description: 'Type de lieu d\'arrivée',
    enum: ['DOMICILE', 'ENTREPRISE', 'HOTEL', 'GARE', 'AEROPORT', 'AGENCE', 'CONCESSION', 'PARTICULIER', 'PARC_AUTO', 'AUTRE']
  })
  @IsString()
  @IsNotEmpty()
  typeLieuArrivee: string;

  @ApiPropertyOptional({ 
    example: 'Hôtel Intercontinental',
    description: 'Nom du lieu d\'arrivée'
  })
  @IsString()
  @IsOptional()
  nomLieuArrivee?: string;

  // ==================== VÉHICULE ====================
  @ApiProperty({ 
    example: 'BERLINE',
    description: 'Type de véhicule',
    enum: ['CITADINE', 'BERLINE', 'COMPACTE', 'CABRIOLET', 'MONOSPACE', 'LUXE', 'VU_3M3', 'VU_6M3', 'VU_9M3', 'VU_12M3', 'VU_15M3', 'VU_20M3', 'VU_25M3', 'VU_30M3']
  })
  @IsString()
  @IsNotEmpty()
  typeVehicule: string;

  @ApiProperty({ 
    example: 'DIESEL',
    description: 'Type de carburant',
    enum: ['ESSENCE', 'DIESEL', 'HYBRIDE', 'ELECTRIQUE']
  })
  @IsString()
  @IsNotEmpty()
  typeCarburant: string;

  @ApiProperty({ 
    example: 'Mercedes Classe E',
    description: 'Marque et modèle du véhicule'
  })
  @IsString()
  @IsNotEmpty()
  marqueModele: string;

  @ApiProperty({ 
    example: 'AB-123-CD',
    description: 'Numéro d\'immatriculation'
  })
  @IsString()
  @IsNotEmpty()
  @Length(7, 10)
  @Matches(/^[A-Z0-9-]+$/, { message: 'Immatriculation invalide' })
  immatriculation: string;

  @ApiProperty({ 
    example: 4,
    description: 'Nombre de places',
    minimum: 2,
    maximum: 9
  })
  @IsInt()
  @Min(2)
  @Max(9)
  @Type(() => Number)
  nombrePlaces: number;

  @ApiProperty({ 
    example: 'AUTOMATIQUE',
    description: 'Type de boîte de vitesses',
    enum: ['AUTOMATIQUE', 'MANUELLE']
  })
  @IsString()
  @IsNotEmpty()
  boiteVitesse: string;

  // ==================== DISPONIBILITÉ ====================
  @ApiProperty({ 
    example: '2024-02-15T09:00:00.000Z',
    description: 'Date et heure de début de disponibilité (doit permettre d\'arriver à temps)'
  })
  @IsDateString()
  dateDebut: string;

  @ApiProperty({ 
    example: '2024-02-15T18:00:00.000Z',
    description: 'Date et heure d\'arrivée souhaitée'
  })
  @IsDateString()
  dateFin: string;

  // ==================== NOTIFICATIONS DÉPART ====================
  @ApiPropertyOptional({ 
    example: true,
    description: 'Activer la notification de départ'
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  notifierDepart?: boolean;

  @ApiPropertyOptional({ 
    example: 'Jean Dupont',
    description: 'Nom du contact à notifier au départ'
  })
  @IsString()
  @IsOptional()
  nomContactDepart?: string;

  @ApiPropertyOptional({ 
    example: '+33612345678',
    description: 'Téléphone du contact au départ (format: 0XXXXXXXXX ou +33XXXXXXXXX)'
  })
  @IsString()
  @IsOptional()
  @Matches(/^((\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/, {
    message: 'Numéro de téléphone de départ invalide (format attendu : 0XXXXXXXXX ou +33XXXXXXXXX)',
  })
  telephoneContactDepart?: string;

  // ==================== NOTIFICATIONS ARRIVÉE ====================
  @ApiPropertyOptional({ 
    example: true,
    description: 'Activer la notification d\'arrivée'
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  notifierArrivee?: boolean;

  @ApiPropertyOptional({ 
    example: 'Marie Martin',
    description: 'Nom du contact à notifier à l\'arrivée'
  })
  @IsString()
  @IsOptional()
  nomContactArrivee?: string;

  @ApiPropertyOptional({ 
    example: '+33687654321',
    description: 'Téléphone du contact à l\'arrivée (format: 0XXXXXXXXX ou +33XXXXXXXXX)'
  })
  @IsString()
  @IsOptional()
  @Matches(/^((\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/, {
    message: 'Numéro de téléphone d\'arrivée invalide (format attendu : 0XXXXXXXXX ou +33XXXXXXXXX)',
  })
  telephoneContactArrivee?: string;

  // ==================== COMMENTAIRE ====================
  @ApiPropertyOptional({ 
    example: 'Client VIP - Prévoir bouteilles d\'eau',
    description: 'Commentaire ou instructions spéciales',
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  commentaire?: string;
}
