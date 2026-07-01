import { Module } from '@nestjs/common';
import { MissionTrackingService } from './mission-tracking.service';
import { MissionTrackingResolver } from './mission-tracking.resolver';
import { SecuriteScoreModule } from '../securite-score/securite-score.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  providers: [MissionTrackingResolver, MissionTrackingService],
  imports: [SecuriteScoreModule,PrismaModule],
})
export class MissionTrackingModule {}
  