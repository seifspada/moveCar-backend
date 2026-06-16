import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScoresMlService } from './scores-ml.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [ScoresMlService, PrismaService],
  exports: [ScoresMlService],
})
export class ScoresMlModule {}
