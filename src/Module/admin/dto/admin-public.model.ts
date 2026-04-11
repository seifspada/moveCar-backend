import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AdminPublic {
  @Field()
  nom: string;

  @Field()
  email: string;
}