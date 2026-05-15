// src/Module/missions/inputs/create-mission.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateMissionInput {
  @Field(() => Int)
  agentId: number;

  @Field()
  villeDepart: string;

  @Field()
  adresseDepartComplete: string;

  @Field()
  typeLieuDepart: string;

  @Field({ nullable: true })
  nomLieuDepart?: string;

  @Field()
  villeArrivee: string;

  @Field()
  adresseArriveeComplete: string;

  @Field()
  typeLieuArrivee: string;

  @Field({ nullable: true })
  nomLieuArrivee?: string;

  @Field()
  typeVehicule: string;

  @Field()
  typeCarburant: string;

  @Field()
  marqueModele: string;

  @Field()
  immatriculation: string;

  @Field(() => Int)
  nombrePlaces: number;

  @Field()
  boiteVitesse: string;

  @Field()
  dateDebut: string;

  @Field()
  dateFin: string;

  @Field({ nullable: true })
  notifierDepart?: boolean;

  @Field({ nullable: true })
  nomContactDepart?: string;

  @Field({ nullable: true })
  telephoneContactDepart?: string;

  @Field({ nullable: true })
  notifierArrivee?: boolean;

  @Field({ nullable: true })
  nomContactArrivee?: string;

  @Field({ nullable: true })
  telephoneContactArrivee?: string;

  @Field({ nullable: true })
  commentaire?: string;
}