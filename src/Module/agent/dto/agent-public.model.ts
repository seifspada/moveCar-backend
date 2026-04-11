// backend/src/Module/adherent/models/adherent-public.model.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AgentPublic {
  @Field()
  nom: string;

  @Field()
  prenom: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  photo: string;
}
