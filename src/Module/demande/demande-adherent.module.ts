import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { GeoModule } from '../geo/geo.module';
import { DemandeAdherentService } from './demande-adherent.service';
import { DemandeAdherentController } from './demande-adherent.controller';

@Module({
  imports: [PrismaModule,EmailModule,GeoModule],
  controllers: [DemandeAdherentController],
  providers: [DemandeAdherentService],
  exports: [DemandeAdherentService],
})
export class DemandeAdherentModule {}
