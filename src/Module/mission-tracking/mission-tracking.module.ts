import { Module } from '@nestjs/common';
import { MissionTrackingService } from './mission-tracking.service';
import { MissionTrackingResolver } from './mission-tracking.resolver';

@Module({
  providers: [MissionTrackingResolver, MissionTrackingService],
})
export class MissionTrackingModule {}
