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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      context: ({ req, reply }) => ({ req, reply }), // Ajouter reply pour Fastify
      playground: true, // Interface GraphQL
      introspection: true,
    }),

    PrismaModule,
    RoleModule,
    UserModule,
    AuthModule,
    DemandeAdherentModule,
    AdherentModule,
    DemandePartenaireModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
