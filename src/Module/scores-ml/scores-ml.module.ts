import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScoresMlService } from './scores-ml.service';
import { ScoresMlController } from './scores-ml.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [ScoresMlService, PrismaService],
  controllers: [ScoresMlController],
  exports: [ScoresMlService],
})
export class ScoresMlModule {}
