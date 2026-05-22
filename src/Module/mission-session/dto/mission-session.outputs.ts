// src/Module/mission-session/dto/mission-session.outputs.ts

import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PhotoValidationResult {
  @Field()
  valide: boolean;

  @Field(() => [String])
  manquantes: string[];
}