import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PartenaireMissionHeader {
  @Field()
  entite: string;

  @Field({ nullable: true })
  adresse: string;

  @Field({ nullable: true })
  ville: string;
}
