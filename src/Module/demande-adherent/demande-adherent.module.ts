import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { GeoModule } from '../geo/geo.module';
import { DemandeAdherentService } from './demande-adherent.service';
import { DemandeAdherentController } from './demande-adherent.controller';
import { DemandeAdherentGateway } from './gateways/demande-adherent.gateway';
import { DocumentProcessingModule } from '../document-processing/document-processing.module';

@Module({
  imports: [PrismaModule,EmailModule,GeoModule,DocumentProcessingModule],
  controllers: [DemandeAdherentController],
  providers: [DemandeAdherentService, DemandeAdherentGateway],
  exports: [DemandeAdherentService],
})
export class DemandeAdherentModule {}
