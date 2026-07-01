// src/Module/securite-score/securite-score.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SecuriteScoreService } from './securite-score.service';
import { SecuriteScoreController } from './securite-score.controller';

@Module({
  imports: [HttpModule],
  controllers: [SecuriteScoreController],
  providers: [SecuriteScoreService],
  exports: [SecuriteScoreService],
})
export class SecuriteScoreModule {}