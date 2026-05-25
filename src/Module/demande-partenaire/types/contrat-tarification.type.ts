import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class ContratTarificationType {
  @Field(() => Float, { nullable: true })
  prixParKm?: number;

  @Field(() => Float, { nullable: true })
  depassementKilometrage?: number;

  @Field(() => Float, { nullable: true })
  retardSansAvertissement?: number;

  @Field(() => Float, { nullable: true })
  restitutionAutreEndroit?: number;
}