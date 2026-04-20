import { Module } from '@nestjs/common';
import { ReservationsMissionService } from './reservations-mission.service';
import { ReservationsMissionResolver } from './reservations-mission.resolver';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';



@Module({
  imports: [PrismaModule, EmailModule],
  providers: [ReservationsMissionResolver, ReservationsMissionService],
  exports: [ReservationsMissionService]
})
export class ReservationsMissionModule {}
