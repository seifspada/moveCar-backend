// src/Module/alertes/alertes.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // ← ajout
import { AlertesService } from './alertes.service';
import { AlertesResolver } from './alertes.resolver';
import { AlertesController } from './alertes.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    HttpModule,         // ← ajout
    NotificationModule,
  ],
  providers: [
    AlertesService,
    AlertesResolver,
    AlertesController,
    PrismaService,
    EmailService,
    GeoService,
  ],
  exports: [AlertesService],
})
export class AlertesModule {}