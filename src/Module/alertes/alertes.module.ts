// src/Module/alertes/alertes.module.ts
import { Module } from '@nestjs/common';
import { AlertesController } from './alertes.controller';
import { AlertesService } from './alertes.service';
import { EmailModule } from '../email/email.module';
import { GeoModule } from '../geo/geo.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EmailModule,GeoModule],
  controllers: [AlertesController],
  providers: [AlertesService],
  exports: [AlertesService], // Pour l'utiliser dans MissionsService
})
export class AlertesModule {}
