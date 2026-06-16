import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService],
})
export class ScoringModule {}
