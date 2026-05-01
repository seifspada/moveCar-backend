import { Module } from '@nestjs/common';
import { PreTripInspectionService } from './pretrip-inspection.service';
import { PreTripInspectionResolver } from './pretrip-inspection.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PreTripInspectionController } from './pretrip-inspection.controller';
import { MissionsModule } from '../missions/missions.module';
import { EmailModule } from '../email/email.module';
import { AlertesModule } from '../alertes/alertes.module';

@Module({
  imports: [
    PrismaModule,      // pour PrismaService
    AuthModule,        // pour GqlAuthGuard, RolesGuard, JwtStrategy
    MissionsModule,    // pour MissionsService
    EmailModule,       // pour EmailService
    AlertesModule,     // pour AlertesService
  ],
  controllers: [PreTripInspectionController],
  providers: [
    PreTripInspectionService,
    PreTripInspectionResolver,
  ],
  exports: [PreTripInspectionService], // exporté si d'autres modules veulent l'utiliser
})
export class PreTripInspectionModule {}