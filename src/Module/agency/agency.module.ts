import { Module } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { AgencyController } from './agency.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module'; // ✅ ajouter cet import
import { Agent } from 'http';
import { AgentService } from '../agent/agent.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule, // ✅ obligatoire pour injecter EmailService
  ],
  controllers: [AgencyController],
  providers: [AgencyService,AgentService],
    exports: [AgencyService],

  
})
export class AgencyModule {}
