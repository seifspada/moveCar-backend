// src/securite-score/securite-score.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SecuriteScoreService } from './securite-score.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [SecuriteScoreService],
  exports: [SecuriteScoreService],
})
export class SecuriteScoreModule {}