import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StatutPreTripInspection } from '../enum/pretrip-inspection.enums';

// ============================================
// INPUT 1 : DÉMARRER UNE FICHE
// ============================================
@InputType('StartInspectionInput', {
  description: 'Crée une nouvelle fiche technique pour une réservation',
})
export class StartInspectionInput {
  @Field(() => String, { description: 'ID de la réservation à inspecter' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Position GPS du convoyeur au démarrage',
  })
  @IsOptional()
  @IsLatitude()
  latitudeDebut?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLongitude()
  longitudeDebut?: number;
}

// ============================================
// INPUT 2 : SOUMETTRE LE CONSENTEMENT
// ============================================
@InputType('SubmitConsentInput', {
  description: 'Acceptation des conditions de mission par le convoyeur',
})
export class SubmitConsentInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  inspectionId: string;

  @Field(() => String, {
    description: 'Version des conditions affichées au convoyeur (ex: "v1.0")',
  })
  @IsString()
  @IsNotEmpty()
  versionConditions: string;

  // ----- Les 9 clauses individuelles -----
  @Field(() => Boolean, {
    description: 'Le véhicule a été vérifié avant le départ',
  })
  @IsBoolean()
  vehiculeVerifie: boolean;

  @Field(() => Boolean, {
    description: 'Les photos sont réelles et prises au moment de la mission',
  })
  @IsBoolean()
  photosReelles: boolean;

  @Field(() => Boolean, {
    description: 'Engagement à respecter le code de la route',
  })
  @IsBoolean()
  codeRoute: boolean;

  @Field(() => Boolean, {
    description: 'Engagement à conduire de manière responsable',
  })
  @IsBoolean()
  conduiteResponsable: boolean;

  @Field(() => Boolean, {
    description: 'Acceptation du suivi GPS en temps réel',
  })
  @IsBoolean()
  suiviGps: boolean;

  @Field(() => Boolean, {
    description: 'Acceptation du scoring de conduite',
  })
  @IsBoolean()
  scoringConduite: boolean;

  @Field(() => Boolean, {
    description: 'Responsabilité en cas de comportement dangereux',
  })
  @IsBoolean()
  responsabiliteNegligence: boolean;

  @Field(() => Boolean, {
    description: 'Apte à conduire (repos et concentration)',
  })
  @IsBoolean()
  apteAConduire: boolean;

  @Field(() => Boolean, {
    description: "Case obligatoire : J'accepte toutes les conditions",
  })
  @IsBoolean()
  acceptationGlobale: boolean;

  // ----- Géolocalisation au moment de la signature -----
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

// ============================================
// INPUT 3 : VALIDATION FINALE & DÉMARRAGE MISSION
// ============================================
@InputType('ValidateInspectionInput', {
  description: 'Validation finale de la fiche et démarrage de la mission',
})
export class ValidateInspectionInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  inspectionId: string;

  @Field(() => Float, {
    nullable: true,
    description: 'GPS du convoyeur au moment du clic final',
  })
  @IsOptional()
  @IsLatitude()
  latitudeFin?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsLongitude()
  longitudeFin?: number;
}

// ============================================
// INPUT 4 : FILTRES POUR LES QUERIES
// ============================================
@InputType('InspectionFilterInput', {
  description: 'Filtres pour lister les inspections',
})
export class InspectionFilterInput {
  @Field(() => StatutPreTripInspection, {
    nullable: true,
    description: 'Filtrer par statut (DRAFT, IN_PROGRESS, VALIDATED, REJECTED)',
  })
  @IsOptional()
  @IsEnum(StatutPreTripInspection)
  statut?: StatutPreTripInspection;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  adherentId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reservationId?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take?: number;
}