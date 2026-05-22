// src/Module/mission-session/entities/mission-session-media.entity.ts

import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

// ✅ Enums
export enum EtapeSession {
  PRE_DEPART = 'PRE_DEPART',
  POST_LIVRAISON = 'POST_LIVRAISON',
}

registerEnumType(EtapeSession, { name: 'EtapeSession' });

export enum TypeMediaSession {
  // ──── PRÉ-DÉPART (véhicule avant mission) ────
  PHOTO_AVANT = 'PHOTO_AVANT',
  PHOTO_ARRIERE = 'PHOTO_ARRIERE',
  PHOTO_GAUCHE = 'PHOTO_GAUCHE',
  PHOTO_DROIT = 'PHOTO_DROIT',
  PHOTO_INTERIEUR = 'PHOTO_INTERIEUR',
  PHOTO_TABLEAU_BORD = 'PHOTO_TABLEAU_BORD',
  PHOTO_CARBURANT = 'PHOTO_CARBURANT',
  DEGATS_PRE_MISSION = 'DEGATS_PRE_MISSION',

  // ──── DOCUMENTS ────
  PERMIS_RECTO_CONDUCTEUR = 'PERMIS_RECTO_CONDUCTEUR',
  PERMIS_VERSO_CONDUCTEUR = 'PERMIS_VERSO_CONDUCTEUR',

  // ──── POST-LIVRAISON (véhicule après mission) ────
  PHOTO_AVANT_FINAL = 'PHOTO_AVANT_FINAL',
  PHOTO_ARRIERE_FINAL = 'PHOTO_ARRIERE_FINAL',
  PHOTO_GAUCHE_FINAL = 'PHOTO_GAUCHE_FINAL',
  PHOTO_DROIT_FINAL = 'PHOTO_DROIT_FINAL',
  PHOTO_INTERIEUR_FINAL = 'PHOTO_INTERIEUR_FINAL',
  PHOTO_TABLEAU_BORD_FINAL = 'PHOTO_TABLEAU_BORD_FINAL',
  CARBURANT_FINAL = 'CARBURANT_FINAL',
  DEGATS_POST_MISSION = 'DEGATS_POST_MISSION',
  PREUVE_LIVRAISON = 'PREUVE_LIVRAISON',
  SIGNATURE_CLIENT = 'SIGNATURE_CLIENT',
}

registerEnumType(TypeMediaSession, { name: 'TypeMediaSession' });

// ============================================
// 📸 MISSION SESSION MEDIA
// ============================================

@ObjectType('MissionSessionMedia')
export class MissionSessionMediaEntity {
  @Field(() => ID)
  id: string;

  @Field()
  sessionId: string;

  @Field(() => EtapeSession)
  etape: EtapeSession;

  @Field(() => TypeMediaSession)
  typeMedia: TypeMediaSession;

  @Field({ nullable: true })
  description?: string;

  @Field()
  cheminFichier: string;

  @Field({ nullable: true })
  urlPublic?: string;

  @Field(() => Int, { nullable: true })
  tailleOctets?: number;

  @Field({ nullable: true })
  typeContenu?: string;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}

// ============================================
// 🏁 MISSION COMPLETION MEDIA
// ============================================

@ObjectType('MissionCompletionMedia')
export class MissionCompletionMediaEntity {
  @Field(() => ID)
  id: string;

  @Field()
  completionId: string;

  @Field(() => TypeMediaSession)
  typeMedia: TypeMediaSession;

  @Field({ nullable: true })
  description?: string;

  @Field()
  cheminFichier: string;

  @Field({ nullable: true })
  urlPublic?: string;

  @Field(() => Int, { nullable: true })
  tailleOctets?: number;

  @Field({ nullable: true })
  typeContenu?: string;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}
