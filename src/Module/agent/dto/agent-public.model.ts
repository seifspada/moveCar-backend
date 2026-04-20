import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AgentPublic {
  @Field(() => Int)
  id: number;          // ✅ AJOUTER

  @Field()
  email: string;

  @Field()
  nom: string;

  @Field()
  prenom: string;

  @Field({ nullable: true })
  photo?: string | null;

  @Field(() => Int, { nullable: true })
  agenceId?: number | null;  // ✅ AJOUTER
}