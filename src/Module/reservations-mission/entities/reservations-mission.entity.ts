// src/Module/reservations-mission/entities/reservations-mission.entity.ts
import {
  ObjectType,
  Field,
  ID,
  registerEnumType,
  Float,
  Int,
} from '@nestjs/graphql';
import { StatutReservation } from '@prisma/client';
import { MissionEntity } from 'src/Module/missions/types/mission-entity.type';
import { AdherentSimpleEntity } from './adherent-simple.entity';

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

  @Field(() => MissionEntity, { nullable: true })
  mission?: MissionEntity;

  @Field(() => Int)
  adherentId: number;

  @Field(() => AdherentSimpleEntity, { nullable: true })
  adherent?: AdherentSimpleEntity;

  // ✅ FIX: nouveau statut enum (ACCEPTED_BY_AGENT, CONFIRMED_BY_ADHERENT, ANNULATION_DEMANDEE)
  @Field(() => StatutReservation)
  statut: StatutReservation;

  // ✅ Nouveau — statut avant ANNULATION_DEMANDEE (pour rollback)
  @Field(() => StatutReservation, { nullable: true })
  statutPrecedent?: StatutReservation;

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

  @Field(() => Int, { nullable: true })
  dureeEstimee?: number;

  @Field({ nullable: true })
  commentaireAdherent?: string;

  @Field({ nullable: true })
  commentaireAgent?: string;

  // ─── Motifs ───────────────────────────────

  @Field({ nullable: true })
  motifRefus?: string;

  // ✅ Nouveau — cause du 400 Bad Request
  @Field({ nullable: true })
  motifAnnulation?: string;

  // ✅ Nouveau — "ADHERENT" | "AGENT"
  @Field({ nullable: true })
  annulePar?: string;

  // ─── Montants ─────────────────────────────

  @Field(() => Float)
  montantTotal: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  distanceKm: number;

  // ─── Dates ────────────────────────────────

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;

  @Field({ nullable: true })
  dateValidation?: Date;

  @Field({ nullable: true })
  dateRefus?: Date;

  // ✅ Nouveau — étape 1 : agent accepte
  @Field({ nullable: true })
  dateAcceptationAgent?: Date;

  // ✅ Nouveau — étape 2 : adhérent confirme
  @Field({ nullable: true })
  dateConfirmationAdherent?: Date;

  // ✅ Nouveau — date annulation effective
  @Field({ nullable: true })
  dateAnnulation?: Date;
}