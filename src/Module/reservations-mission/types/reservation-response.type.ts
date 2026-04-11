// src/Module/reservations-mission/types/reservation-response.type.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { ReservationMissionEntity } from '../entities/reservations-mission.entity';

@ObjectType()
export class ReservationResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  code?: string;

  @Field(() => ReservationMissionEntity, { nullable: true })
  reservation?: ReservationMissionEntity;
}
