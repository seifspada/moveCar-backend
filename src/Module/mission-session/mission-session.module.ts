// src/Module/mission-session/mission-session.module.ts

import { Module } from '@nestjs/common';
import { MissionSessionService }  from './mission-session.service';
import { MissionSessionResolver } from './mission-session.resolver';
import { PrismaService }          from '../../prisma/prisma.service';

@Module({
  providers: [
    MissionSessionService,
    MissionSessionResolver,
    PrismaService,
  ],
})
export class MissionSessionModule {}