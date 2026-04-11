import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { StatutMission } from '@prisma/client';

@ObjectType()
export class AdresseType {
  @Field()
  id: string;

  @Field()
  ville: string;

  @Field({ nullable: true })
  codePostal?: string;

  @Field({ nullable: true })
  pays?: string;
}

@ObjectType()
export class VehiculeType {
  @Field()
  id: string;

  @Field()
  typeVehicule: string;

  @Field()
  typeCarburant: string;
}

@ObjectType()
export class DisponibiliteType {
  @Field()
  id: string;

  @Field()
  dateDebut: Date;

  @Field()
  dateFin: Date;

  @Field({ nullable: true })
  dateDepartMax?: Date;

  // Champs calculés
  @Field()
  dateDepartMaxFormatee: string;

  @Field(() => Int)
  dureeMinutes: number;

  @Field()
  dureeFormatee: string;
}

@ObjectType()
export class CalculMissionType {
  @Field()
  id: string;

  @Field(() => Float)
  distanceKm: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  montantTotal: number;
}

@ObjectType()
export class MissionDetailType {
  @Field()
  id: string;

  @Field()
  statut: StatutMission;

  @Field({ nullable: true })
  commentaire?: string;

  @Field()
  dateCreation: Date;

  // Relations
  @Field(() => VehiculeType)
  vehicule: VehiculeType;

  @Field(() => AdresseType)
  adresseDepart: AdresseType;

  @Field(() => AdresseType)
  adresseArrivee: AdresseType;

  @Field(() => DisponibiliteType, { nullable: true })
  disponibilite?: DisponibiliteType;

  @Field(() => CalculMissionType, { nullable: true })
  calculs?: CalculMissionType;

  // Champs calculés directs (pour compatibilité)
  @Field(() => Float)
  distanceKm: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  montantTotal: number;

  @Field(() => Int)
  dureeMinutes: number;

  @Field()
  dureeFormatee: string;

  @Field()
  dateDepartMaxFormatee: string;
}
