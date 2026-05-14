import { ObjectType, Field, Int, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class AlerteGeographique {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  userId: number;

  @Field()
  type: string;

  @Field(() => Int)
  rayon: number;

  @Field()
  actif: boolean;

  @Field()
  emailActif: boolean;

  @Field()
  pushActif: boolean;

  @Field({ nullable: true })
  fcmToken?: string;

  // ── Géographique ──
  @Field({ nullable: true })
  villeNom?: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  // ── Trajet ──
  @Field({ nullable: true })
  villeDepartNom?: string;

  @Field(() => Float, { nullable: true })
  latitudeDepart?: number;

  @Field(() => Float, { nullable: true })
  longitudeDepart?: number;

  @Field({ nullable: true })
  villeArriveeNom?: string;

  @Field(() => Float, { nullable: true })
  latitudeArrivee?: number;

  @Field(() => Float, { nullable: true })
  longitudeArrivee?: number;

  @Field({ nullable: true })
  dateDepart?: Date;

  @Field({ nullable: true })
  dateDepartMax?: Date;

  @Field()
  dateCreation: Date;
}