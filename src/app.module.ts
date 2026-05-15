// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../movecar-65d1e-firebase-adminsdk-fbsvc-522d57c522.json';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MissionsModule } from './Module/missions/missions.module';
import { RouteCalculatorModule } from './Module/route-calculator/route-calculator.module';
import { AlertesModule } from './Module/alertes/alertes.module';
import { GeoModule } from './Module/geo/geo.module';
import { AuthModule } from './auth/auth.module';
import { AdherentModule } from './Module/adherent/adherent.module';
import { PartenaireModule } from './Module/partenaire/partenaire.module';
import { DemandeAdherentModule } from './Module/demande-adherent/demande-adherent.module';
import { EmailModule } from './Module/email/email.module';
import { RoleModule } from './role/role.module';
import { ReservationsMissionModule } from './Module/reservations-mission/reservations-mission.module';
import { AgencyModule } from './Module/agency/agency.module';
import { AgentModule } from './Module/agent/agent.module';
import { DemandePartenaireModule } from './Module/demande-partenaire/demande-partenaire.module';
import { AdminModule } from './Module/admin/admin.module';
import { DocumentProcessingModule } from './Module/document-processing/document-processing.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PreTripInspectionModule } from './Module/pretrip-inspection/pretrip-inspection.module';
import { NotificationModule } from './Module/notification/notification.module';

// ✅ Initialisation Firebase Admin (une seule fois au démarrage)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      serviceAccount as admin.ServiceAccount,
    ),
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      playground: true,
      introspection: true,
      sortSchema: true,
      debug: true,
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      context: ({ req, res }) => ({ req, res }),
    }),

    PrismaModule,
    GeoModule,
    RouteCalculatorModule,
    AlertesModule,
    MissionsModule,
    AuthModule,
    AdherentModule,
    PartenaireModule,
    DemandeAdherentModule,
    DemandePartenaireModule,
    EmailModule,
    RoleModule,
    ReservationsMissionModule,
    AgencyModule,
    AgentModule,
    AdminModule,
    DocumentProcessingModule,
    PreTripInspectionModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}