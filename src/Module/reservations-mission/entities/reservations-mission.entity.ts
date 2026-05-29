// src/Module/reservations-mission/entities/reservations-mission.entity.ts
import {
  ObjectType,
  Field,
  ID,
  registerEnumType,
  Float,
  Int,
} from '@nestjs/graphql';
import { AdherentSimpleEntity } from './adherent-simple.entity';
import { MissionEntity } from '../../missions/types/mission-entity.type';
import { StatutReservation } from '@prisma/client';

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

  // ✅ adherentId retiré du @Field — non utilisé côté Flutter
  adherentId: number;

  @Field(() => AdherentSimpleEntity, { nullable: true })
  adherent?: AdherentSimpleEntity;

  @Field(() => StatutReservation)
  statut: StatutReservation;

  @Field(() => StatutReservation, { nullable: true })
  statutPrecedent?: StatutReservation;

  @Field()
  numeroReservation: string;

  // ─── Dates de trajet ──────────────────────────────────────

  @Field()
  dateDepart: Date;

  @Field()
  heureDepart: string;

  // ✅ FIX — nullable pour cohérence avec Flutter (String? dateArrivee)
  @Field({ nullable: true })
  dateArrivee?: Date;

  // ✅ FIX — nullable pour cohérence avec Flutter (String? heureArrivee)
  @Field({ nullable: true })
  heureArrivee?: string;

  @Field(() => Int, { nullable: true })
  dureeEstimee?: number;

  // ─── Commentaires (non utilisés Flutter — gardés pour agent/admin) ───

  @Field({ nullable: true })
  commentaireAdherent?: string;

  @Field({ nullable: true })
  commentaireAgent?: string;

  // ─── Motifs ───────────────────────────────────────────────

  @Field({ nullable: true })
  motifRefus?: string;

  @Field({ nullable: true })
  motifAnnulation?: string;

  @Field({ nullable: true })
  annulePar?: string;

  // ─── Montants ─────────────────────────────────────────────

  // ✅ Float non-nullable cohérent avec Prisma Decimal non-nullable
  // Le service garantit toujours une valeur (|| 0)
  @Field(() => Float)
  montantTotal: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  distanceKm: number;

  // ─── Dates système ────────────────────────────────────────

  // ✅ dateCreation non-nullable — @default(now()) en Prisma
  @Field()
  dateCreation: Date;

  // ✅ dateModification retiré du @Field — non utilisé côté Flutter
  dateModification: Date;

  // ✅ Ces champs existent en Prisma mais non utilisés Flutter
  // Gardés sans @Field pour éviter exposition inutile
  dateValidation?: Date;
  dateRefus?: Date;

  // ─── Dates workflow réservation ───────────────────────────

  @Field({ nullable: true })
  dateAcceptationAgent?: Date;

  @Field({ nullable: true })
  dateConfirmationAdherent?: Date;

  @Field({ nullable: true })
  dateAnnulation?: Date;
}