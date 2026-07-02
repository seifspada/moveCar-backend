import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';


export enum IncidentType {
  DEVIATION_GPS = 'DÉVIATION_GPS',
  VITESSE_EXCESSIVE = 'VITESSE_EXCESSIVE',
  ARRET_PROLONGE = 'ARRÊT_PROLONGÉ',
  DETOUR_INJUSTIFIE = 'DÉTOUR_INJUSTIFIÉ',
  ANOMALIE_CARBURANT = 'ANOMALIE_CARBURANT',
}


@ObjectType()
export class MissionTracking {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  missionId?: string;

  @Field(() => ID, { nullable: true })
  sessionId?: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float, { nullable: true })
  accuracy?: number;

  @Field(() => Float, { nullable: true })
  speed?: number;

  @Field(() => Date)
  timestamp: Date;

  @Field(() => Date, { nullable: true })
  timestampServer?: Date;

  @Field(() => Boolean, { nullable: true })
  isValid?: boolean;

  @Field(() => Boolean)
  isDeviated: boolean;

  @Field(() => Float, { nullable: true })
  distanceFromRoute?: number;

  @Field(() => String, { nullable: true })
  deviationReason?: string;
}

@ObjectType()
export class ActiveMissionMap {
  @Field(() => ID)
  missionId: string;

  @Field(() => ID)
  sessionId: string;

  @Field(() => String)
  vehicleName: string;

  @Field(() => String)
  convoyeurName: string;

  // Statut GPS/session (compatibilité ancien code)
  @Field(() => String)
  status: string;

  // ✅ NOUVEAU : statut métier pour le frontend (EN_COURS, TERMINEE, PROBLEME_TRAJET…)
  @Field(() => String)
  statut: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  // ✅ NOUVEAU : coordonnées départ (nullable car pas toujours disponibles)
  @Field(() => Float, { nullable: true })
  latitudeDepart?: number;

  @Field(() => Float, { nullable: true })
  longitudeDepart?: number;

  // Existant — passé en nullable pour cohérence avec le service
  @Field(() => Float, { nullable: true })
  latitudeArrivee?: number;

  @Field(() => Float, { nullable: true })
  longitudeArrivee?: number;

  @Field(() => Float, { nullable: true })
  accuracy?: number;

  @Field(() => Date)
  lastGpsAt: Date;

  @Field(() => Boolean)
  isDeviated: boolean;

  // ✅ NOUVEAU : champs évaluation (sur Mission directement)
  @Field(() => Float, { nullable: true })
  noteAgent?: number;

  @Field(() => Float, { nullable: true })
  scoreLogistique?: number;

  @Field(() => String, { nullable: true })
  scorePredictedLabel?: string;
}

@ObjectType()
export class MissionCompletion {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  missionId: string;

  @Field(() => Float)
  latitudeFin: number;

  @Field(() => Float)
  longitudeFin: number;

  @Field(() => Int)
  totalLocations: number;

  @Field(() => Int)
  validLocations: number;

  @Field(() => Int)
  invalidLocations: number;

  @Field(() => Float, { nullable: true })
  maxDeviation?: number;

  @Field(() => Int, { nullable: true })
  dureeTrajet?: number;

  @Field(() => Boolean)
  completed: boolean;

  @Field(() => Date, { nullable: true })
  dateCompletion?: Date;

  @Field(() => String, { nullable: true })
  invalidationReason?: string;

  @Field(() => Date)
  dateCreation: Date;
}


@ObjectType()
export class MissionIncidentMediaEntity  {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  incidentId: string;

  @Field(() => Float)
  cheminFichier: string;

  @Field(() => Float)
  tailleOctets: number;

  @Field(() => Int)
  ordre: number;


  @Field(() => Date)
  dateCreation: Date;
}

@ObjectType()
export class MissionIncidentResult {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sessionId: string;

  // Type et description
  @Field(() => IncidentType)
  typeIncident: IncidentType;

  @Field()
  description: string;

  // Localisation au moment de l'incident
  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  // Photos liées (max 3)
  @Field(() => [MissionIncidentMediaEntity])
  medias: MissionIncidentMediaEntity[];

  // Résolution
  @Field({ nullable: true })
  resolvedBy: string | null;

  @Field({ nullable: true })
  resolutionNotes: string | null;

  @Field(() => Date, { nullable: true })
  dateResolution: Date | null;

  // Traçabilité
  @Field(() => Date)
  dateCreation: Date;
}


@ObjectType()
export class MissionIncidentMediaResult {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sessionId: string;

  @Field()
  cheminFichier: string;

  @Field(() => Int)
  tailleOctets: number;

  @Field(() => Int)
  ordre: number;

  @Field(() => Date)
  dateCreation: Date;
}