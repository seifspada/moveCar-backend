import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PartenaireNavbar {
  @Field()
  entite: string;

  @Field()
  email: string;


   @Field(() => String, { nullable: true })  // ✅ AJOUTÉ
  photo: string | null;
}
