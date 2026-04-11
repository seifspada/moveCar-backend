import { Module } from '@nestjs/common';
import { ReservationsMissionService } from './reservations-mission.service';
import { ReservationsMissionResolver } from './reservations-mission.resolver';

@Module({
  providers: [ReservationsMissionResolver, ReservationsMissionService],
})
export class ReservationsMissionModule {}
