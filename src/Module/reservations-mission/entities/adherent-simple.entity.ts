// src/Module/reservations-mission/entities/adherent-simple.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UserSimpleEntity {
  @Field()
  name: string;       // ✅ User.name (pas nom/prenom)

  @Field()
  email: string;

  @Field({ nullable: true })
  photo?: string;
}

@ObjectType()
export class AdherentSimpleEntity {
  @Field(() => ID)
  id: number;

  @Field()
  nom: string;        // ✅ Adherent.nom

  @Field()
  prenom: string;     // ✅ Adherent.prenom

  @Field({ nullable: true })
  telephone?: string; // ✅ Adherent.telephone

  @Field()
  statut: string;

  @Field(() => UserSimpleEntity, { nullable: true })
  user?: UserSimpleEntity;
}
