import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ValidateTokensResult {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  valides: number;

  @Field(() => Int)
  invalides: number;
}
