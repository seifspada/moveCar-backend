// src/Module/mission-session/mission-session.module.ts

import { Module } from '@nestjs/common';
import { MissionSessionService }  from './mission-session.service';
import { MissionSessionResolver } from './mission-session.resolver';
import { PrismaService }          from '../../prisma/prisma.service';
import { ScoresMlModule } from '../scores-ml/scores-ml.module';

@Module({
  imports: [ScoresMlModule],
  providers: [
    MissionSessionService,
    MissionSessionResolver,
    PrismaService,
  ],
})
export class MissionSessionModule {}