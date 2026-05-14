import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ParTypeAlertes {
  @Field(() => Int)
  geographiques: number;

  @Field(() => Int)
  trajets: number;
}

@ObjectType()
export class StatsAlertes {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  actives: number;

  @Field(() => Int)
  inactives: number;

  @Field(() => ParTypeAlertes)
  parType: ParTypeAlertes;
}