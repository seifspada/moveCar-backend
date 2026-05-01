import { InputType, Field, Float, ID } from '@nestjs/graphql';

@InputType()
export class CompleteMissionInput {
  @Field(() => ID)
  missionId: string;

  @Field(() => Float)
  latitudeFin: number;

  @Field(() => Float)
  longitudeFin: number;
}
