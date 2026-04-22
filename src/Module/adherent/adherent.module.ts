import { Module } from '@nestjs/common';
import { AdherentService } from './adherent.service';
import { AdherentController } from './adherent.controller';
import { EmailModule } from '../email/email.module';
import { AdherentResolver } from './adherent.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule,EmailModule],
  controllers: [AdherentController], // ✅ Bien enregistré
  providers: [AdherentService,AdherentResolver],
  exports: [AdherentService],
})
export class AdherentModule {}
