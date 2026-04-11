// src/Module/adherents/entities/adherent.entity.ts
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum StatutAdherent {
  ACTIF = 'ACTIF',
  SUSPENDU = 'SUSPENDU',
  RESILIE = 'RESILIE',
}

export enum TypePack {
  PREMIUM = 'premium',
  BASIC = 'basic',
}

registerEnumType(StatutAdherent, {
  name: 'StatutAdherent',
});

registerEnumType(TypePack, {
  name: 'TypePack',
});

@ObjectType()
export class AdherentEntity {
  @Field(() => ID)
  id: number;

  @Field()
  userId: number;

  @Field()
  nom: string;

  @Field()
  prenom: string;

  @Field({ nullable: true })
  numeroAdherent?: string;

  @Field({ nullable: true })
  dateNaissance?: Date;

  @Field()
  telephone: string;

  @Field({ nullable: true })
  adresse?: string;

  @Field({ nullable: true })
  codePostal?: string;

  @Field()
  ville: string;

  @Field()
  raisonSociale: string;

  @Field()
  numeroKbis: string;

  @Field(() => TypePack)
  typePack: TypePack;

  @Field(() => StatutAdherent)
  statut: StatutAdherent;

  @Field({ nullable: true })
  photoUrl?: string;

  @Field()
  estBloque: boolean;

  @Field({ nullable: true })
  raisonBlocage?: string;

  @Field({ nullable: true })
  dateBlocage?: Date;

  @Field()
  dateAdhesion: Date;

  @Field({ nullable: true })
  dateExpiration?: Date;

  @Field({ nullable: true })
  montantCotisation?: number;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}
