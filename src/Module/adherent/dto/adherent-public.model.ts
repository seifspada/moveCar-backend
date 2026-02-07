// backend/src/Module/adherent/models/adherent-public.model.ts
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AdherentPublic {
  @Field()
  nom: string;

  @Field()
  prenom: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  photo: string;

  @Field()
  typePack: string;
}
