import { InputType, Field, Float, ID } from '@nestjs/graphql';

@InputType()
export class UpdateLocationInput {
  @Field(() => ID)
  missionId: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float, { nullable: true })
  accuracy?: number;

  @Field(() => Date)
  timestamp: Date; // timestamp client (quand la position a été prise)
}
