import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';  // ✅ Importer
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { RouteCalculatorModule } from '../route-calculator/route-calculator.module';
import { MissionsResolver } from './missions.resolver';
import { AlertesModule } from '../alertes/alertes.module';
import { GeoService } from '../geo/geo.service';
import { GeoModule } from '../geo/geo.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DemandePartenaireModule } from '../demande-partenaire/demande-partenaire.module';
@Module({
  imports: [
    PrismaModule,
    AlertesModule,
    GeoModule ,
    RouteCalculatorModule,
    DemandePartenaireModule,
    HttpModule,  // ✅ Ajouter HttpModule
    MulterModule.register({
      dest: './uploads/documents',
    }),
  ],
  controllers: [MissionsController],
  providers: [MissionsService,MissionsResolver],
  exports: [MissionsService],
})
export class MissionsModule {}
