import { Module } from '@nestjs/common';
import { DemandeService } from './demande.service';
import { DemandeController } from './demande.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [PrismaModule,EmailModule,GeoModule],
  controllers: [DemandeController],
  providers: [DemandeService],
  exports: [DemandeService],
})
export class DemandeModule {}
