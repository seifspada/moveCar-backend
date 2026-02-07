// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoleModule } from './role/role.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DemandeAdherentModule } from './Module/demande/demande-adherent.module';
import { AdherentModule } from './Module/adherent/adherent.module';
import { DemandePartenaireModule } from './Module/demande-partenaire/demande-partenaire.module';
import { PartenaireModule } from './Module/partenaire/partenaire.module';
import { MissionsModule } from './Module/missions/missions.module';
import { RouteCalculatorModule } from './Module/route-calculator/route-calculator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
      // ✅ CORRECTION: Adapter le context pour Fastify
      context: ({ req, reply }) => {
        // Fastify expose req.raw pour accéder à la requête HTTP native
        return { 
          req: req?.raw || req,  // Compatible Fastify + Express
          reply: reply?.raw || reply,
        };
      },
    }),

    PrismaModule,
    RoleModule,
    UserModule,
    AuthModule,
    DemandeAdherentModule,
    AdherentModule,
    DemandePartenaireModule,
    PartenaireModule,
    MissionsModule,
    RouteCalculatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
