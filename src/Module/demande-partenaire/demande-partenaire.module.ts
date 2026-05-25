// src/Module/demande-partenaire/demande-partenaire.module.ts

import { Module } from '@nestjs/common';
import { DemandePartenaireController } from './demande-partenaire.controller';
import { DemandePartenaireService } from './demande-partenaire.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { DemandePartenaireGateway } from './gateways/demande-partenaire.gateway';
import { DemandePartenaireResolver } from './demande-partenaire.resolver';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [DemandePartenaireController],
  providers: [DemandePartenaireService,DemandePartenaireGateway,DemandePartenaireResolver],
  exports: [DemandePartenaireService]
})
export class DemandePartenaireModule {}
