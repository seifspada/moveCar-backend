// src/Module/reservations-mission/dto/create-reservation.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

@InputType()
export class CreateReservationInput {
  @Field(() => String, { description: 'ID de la mission (UUID)' })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @Field(() => String, { description: 'Date de départ (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateDepart doit être au format YYYY-MM-DD',
  })
  dateDepart: string;

  @Field(() => String, { description: 'Heure de départ (HH:mm)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'heureDepart doit être au format HH:mm',
  })
  heureDepart: string;
}
