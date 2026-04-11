// src/Module/reservations-mission/dto/update-reservation.input.ts
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { CreateReservationInput } from './create-reservations-mission.input';

@InputType()
export class UpdateReservationInput extends PartialType(CreateReservationInput) {
  @Field()
  id: string;
}
