import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AgentResolver } from './agent.resolver';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AgentController],
  providers: [AgentService,AgentResolver],
  exports: [AgentService],
})
export class AgentModule {}
