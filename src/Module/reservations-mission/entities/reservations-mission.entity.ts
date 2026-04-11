// src/Module/reservations-mission/entities/reservation-mission.entity.ts
import { ObjectType, Field, ID, registerEnumType, Float } from '@nestjs/graphql'; // ✅ Importer Float
import { StatutReservation } from '@prisma/client';
import { MissionEntity } from 'src/Module/missions/types/mission-entity.type';

registerEnumType(StatutReservation, {
  name: 'StatutReservation',
  description: 'Statut de la réservation',
});

@ObjectType()
export class ReservationMissionEntity {
  @Field(() => ID)
  id: string;

  @Field()
  missionId: string;

  @Field(() => MissionEntity)
  mission: MissionEntity;

  @Field()
  adherentId: number;

  @Field(() => StatutReservation)
  statut: StatutReservation;

  @Field()
  numeroReservation: string;

  @Field()
  dateDepart: Date;

  @Field()
  heureDepart: string;

  @Field()
  dateArrivee: Date;

  @Field()
  heureArrivee: string;

  @Field({ nullable: true })
  dureeEstimee?: number;

  @Field({ nullable: true })
  commentaireAdherent?: string;

  @Field({ nullable: true })
  commentairePartenaire?: string;

  @Field({ nullable: true })
  dateValidation?: Date;

  @Field({ nullable: true })
  dateRefus?: Date;

  @Field({ nullable: true })
  motifRefus?: string;

  // ✅ Changer Int en Float pour les montants
  @Field(() => Float)
  montantTotal: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  distanceKm: number;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}
