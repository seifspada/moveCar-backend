// mission-minimal.type.ts
import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class MissionCardType {
  @Field()
  id: string;

  @Field()
  typeVehicule: string;

  @Field()
  typeCarburant: string;

  @Field()
  villeDepart: string;

  @Field()
  villeArrivee: string;

  @Field(() => Float)
  distanceKm: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  montantTotal: number;

  @Field()
  dateDebut: Date;

  @Field({ nullable: true })
  dateDepartMax: Date;   // ✅ à la place de dateFin
}
