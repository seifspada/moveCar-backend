// src/Module/mission-session/entities/mission-session.entity.ts

import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AdherentSimpleEntity } from '../../reservations-mission/entities/adherent-simple.entity';
import { StatutSession as PrismaStatutSession } from '@prisma/client'; // ✅ IMPORT
import { MissionSessionMediaEntity } from './mission-session-media.entity'; // ✅ IMPORT

// ✅ Utiliser directement l'enum Prisma
export enum StatutSession {
  EN_COURS  = 'EN_COURS',
  TERMINEE  = 'TERMINEE',
}

registerEnumType(StatutSession, { name: 'StatutSession' });

@ObjectType('MissionSession')
export class MissionSessionEntity {
  @Field(() => ID)
  id: string;

  // ── Relations ──────────────────────────
  @Field()
  reservationId: string;

  @Field()
  missionId: string;

  @Field(() => AdherentSimpleEntity, { nullable: true })
  adherent?: AdherentSimpleEntity | null;

  // ── Consentement ───────────────────────
  @Field(() => Boolean)
  consentAccepted: boolean;

  @Field()
  dateConsentement: Date;

  // ── Démarrage ──────────────────────────
  @Field(() => Float)
  latitudeDebut: number;

  @Field(() => Float)
  longitudeDebut: number;

  @Field()
  dateDebut: Date;

  @Field(() => Int, { nullable: true })
  kilometrageDebut?: number | null;

  // ── Fin ────────────────────────────────
  @Field(() => Float, { nullable: true })
  latitudeFin?: number | null;

  @Field(() => Float, { nullable: true })
  longitudeFin?: number | null;

  @Field({ nullable: true })
  dateFin?: Date | null;

  @Field(() => Int, { nullable: true })
  kilometrageFin?: number | null;

  @Field({ nullable: true })
  commentaireFin?: string | null;

  @Field({ nullable: true })
  signatureClient?: string | null;

  @Field({ nullable: true })
  nomClientSignature?: string | null;

  @Field({ nullable: true })
  dateSignatureClient?: Date | null;

  // ── Statut ─────────────────────────────
  @Field(() => StatutSession)
  statut: StatutSession; // ✅ Type cohérent

  // ── Médias ─────────────────────────────
  @Field(() => [MissionSessionMediaEntity], { nullable: true })
  medias?: MissionSessionMediaEntity[] | null; // ✅ Photos avant/après

  // ── Traçabilité ────────────────────────
  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}
