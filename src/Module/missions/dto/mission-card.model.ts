// missions/dto/mission-card.model.ts

import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { TypeVehiculeEnum, TypeCarburantEnum } from './enums';

@ObjectType('MissionDetails')
export class MissionDetailsType {
  @Field(() => TypeVehiculeEnum, { description: 'Type de véhicule' })  // ✅ Enum, pas String
  typeVehicule: TypeVehiculeEnum;

  @Field(() => TypeCarburantEnum, { description: 'Type de carburant' })  // ✅ Enum, pas String
  typeCarburant: TypeCarburantEnum;

  @Field(() => String, { description: 'Ville de départ' })
  villeDepart: string;

  @Field(() => String, { description: 'Ville d\'arrivée' })
  villeArrivee: string;

  @Field(() => Float, { description: 'Distance en kilomètres' })
  distanceKm: number;

  @Field(() => Float, { description: 'Frais de péage en euros' })
  fraisPeage: number;

  @Field(() => Float, { description: 'Montant total en euros' })
  montantTotal: number;

  @Field(() => String, { description: 'Date de début (ISO)' })
  dateDebut: string;

  @Field(() => String, { description: 'Date de départ maximum (ISO)', nullable: true })
  dateDepartMax: string;

  @Field(() => String, { description: 'Date de départ maximum formatée', nullable: true })
  dateDepartMaxFormatee: string;

  @Field(() => String, { description: 'Date de fin (ISO)' })
  dateFin: string;

  @Field(() => String, { description: 'Durée formatée (ex: 4h35)' })
  dureeFormatee: string;

  @Field(() => Int, { description: 'Durée en minutes' })
  dureeMinutes: number;
}
