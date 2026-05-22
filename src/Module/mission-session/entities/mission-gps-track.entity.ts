import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum IncidentType {
  DÉVIATION_GPS = 'DÉVIATION_GPS',
  VITESSE_EXCESSIVE = 'VITESSE_EXCESSIVE',
  ARRÊT_PROLONGÉ = 'ARRÊT_PROLONGÉ',
  DÉTOUR_INJUSTIFIÉ = 'DÉTOUR_INJUSTIFIÉ',
  ANOMALIE_CARBURANT = 'ANOMALIE_CARBURANT',
}

registerEnumType(IncidentType, { name: 'IncidentType' });

// ========================================
// 📍 Entité GPS Track
// ========================================

@ObjectType('MissionGPSTrack')
export class MissionGPSTrackEntity {
  @Field(() => ID)
  id: string;

  @Field()
  sessionId: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float, { nullable: true })
  accuracy?: number;

  @Field(() => Float, { nullable: true })
  altitude?: number;

  @Field(() => Float, { nullable: true })
  bearing?: number;

  @Field(() => Float, { nullable: true })
  speed?: number;

  @Field(() => Float, { nullable: true })
  distanceFromRoute?: number;

  @Field(() => Boolean)
  isDeviated: boolean;

  @Field()
  timestamp: Date;
}

// ========================================
// 🚨 Entité Incident
// ========================================

@ObjectType('MissionIncident')
export class MissionIncidentEntity {
  @Field(() => ID)
  id: string;

  @Field()
  sessionId: string;

  @Field(() => IncidentType)
  typeIncident: IncidentType;

  @Field()
  description: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field({ nullable: true })
  photoIncident?: string;

  @Field({ nullable: true })
  resolvedBy?: string;

  @Field({ nullable: true })
  resolutionNotes?: string;

  @Field({ nullable: true })
  dateResolution?: Date;

  @Field()
  dateCreation: Date;
}

// ========================================
// 📊 Rapport d'analyse fin de mission
// ========================================

@ObjectType('MissionAnalysisReport')
export class MissionAnalysisReportEntity {
  @Field()
  sessionId: string;

  @Field()
  dateDebut: Date;

  @Field({ nullable: true })
  dateFin?: Date;

  @Field()
  dureeTrajet: number;  // minutes

  @Field(() => Float)
  distanceTotale: number;  // km

  @Field(() => Float)
  vitesseMaxAtteinte: number;  // km/h

  @Field()
  nombreDeviations: number;

  @Field()
  nombreIncidents: number;

  @Field(() => [MissionIncidentEntity])
  incidents: MissionIncidentEntity[];

  @Field()
  conformiteGlobale: string;  // "OK" ou "ALERTES"
}