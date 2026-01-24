// src/email/email.module.ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // ← IMPORTANT : exports pour DI
})
export class EmailModule {}
