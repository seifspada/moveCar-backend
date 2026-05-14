// src/Module/alertes/alertes.module.ts
import { Module } from '@nestjs/common';
import { AlertesService } from './alertes.service';
import { AlertesResolver } from './alertes.resolver';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],   // ← ici, pas dans providers
  providers: [
    AlertesService,
    AlertesResolver,
    PrismaService,
    EmailService,
    GeoService,
    // NotificationModule retiré d'ici
  ],
  exports: [AlertesService],
})
export class AlertesModule {}