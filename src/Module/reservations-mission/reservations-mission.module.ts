import { Module } from '@nestjs/common';
import { ReservationsMissionService } from './reservations-mission.service';
import { ReservationsMissionResolver } from './reservations-mission.resolver';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';



@Module({
  imports: [PrismaModule, EmailModule],
  providers: [ReservationsMissionResolver, ReservationsMissionService],
  exports: [ReservationsMissionService]
})
export class ReservationsMissionModule {}
