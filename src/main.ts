// src/main.ts

import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fastifyCors from '@fastify/cors';
import { join } from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import multipart, { MultipartFile } from '@fastify/multipart';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function saveFiles(
  demandeId: number,
  files: Record<string, MultipartFile[]>,
) {
  const basePath = join(process.cwd(), 'uploads', 'demandes', String(demandeId));

  for (const [key, fileArray] of Object.entries(files)) {
    if (!fileArray?.length) continue;

    const typeDir = join(basePath, key);
    if (!existsSync(typeDir)) {
      await fs.mkdir(typeDir, { recursive: true });
    }

    for (const file of fileArray) {
      const filePath = join(typeDir, `${Date.now()}-${file.filename}`);
      const buffer = await file.toBuffer();
      await fs.writeFile(filePath, buffer);
    }
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 🔍 Logs pour debug Render
  logger.log(`🔍 PORT: ${process.env.PORT}`);
  logger.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`🔍 DATABASE_URL défini: ${!!process.env.DATABASE_URL}`);
  logger.log(`🔍 JWT_SECRET défini: ${!!process.env.JWT_SECRET}`);

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    logger.error('❌ JWT_SECRET non défini dans .env');
    process.exit(1);
  }

  logger.log('✅ Variables d\'environnement chargées');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 52_428_800,
      connectionTimeout: 300_000,
    }),
  );

  // ✅ Multipart plugin
  await app.register(multipart as any, {
    attachFieldsToBody: 'keyValues',
    limits: {
      fileSize: 50 * 1024 * 1024,
      fieldNameSize: 100,
      fieldSize: 1_000_000,
      fields: 30,
      files: 30,
    },
    onFile: async (part: any) => {
      part.value = {
        filename: part.filename,
        mimetype: part.mimetype,
        encoding: part.encoding,
        value: await part.toBuffer(),
      };
    },
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // ✅ CORS Fastify — Flutter Web + Next.js + Vercel
  await app.register(fastifyCors as any, {
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      // Autoriser sans origin (Postman, mobile natif)
      if (!origin) return callback(null, true);

      if (isDevelopment) return callback(null, true);

      const allowedOrigins: (string | RegExp)[] = [
        // Next.js frontend
        'https://move-car-one.vercel.app',
        /^https:\/\/move-car.*\.vercel\.app$/,
        'http://localhost:3001',
        'http://127.0.0.1:3001',

        // Flutter Web (ports dynamiques)
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ];

      const allowed = allowedOrigins.some((o) =>
        typeof o === 'string' ? o === origin : o.test(origin),
      );

      if (allowed) {
        callback(null, true);
      } else {
        logger.warn(`🚫 CORS bloqué pour origin: ${origin}`);
        callback(new Error(`CORS non autorisé pour: ${origin}`), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });

  logger.log(
    `✅ CORS activé (mode: ${
      isDevelopment ? 'development - all origins' : 'production - origins restreints'
    })`,
  );

  // ✅ Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ✅ Exception filter global
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ✅ Swagger
  const config = new DocumentBuilder()
    .setTitle('API TransConvoy')
    .setDescription(
      'API de gestion des rôles, utilisateurs et authentification',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez votre token JWT',
      },
      'Bearer',
    )
    .addServer('http://localhost:3000', 'Serveur de développement')
    .addServer('http://localhost:3001', 'Frontend Next.js')
    .addTag('Auth', "Endpoints d'authentification")
    .addTag('Users', 'Gestion des utilisateurs')
    .addTag('Roles', 'Gestion des rôles')
    .addTag('Agencies', 'Gestion des agences')
    .addTag('Agents', 'Gestion des agents')
    .addTag('Adherents', 'Gestion des adhérents')
    .addTag('Partenaires', 'Gestion des partenaires')
    .addTag('Demandes Partenaire', 'Demandes de partenariat')
    .addTag('Demandes Adhérent', "Demandes d'adhésion")
    .addTag('Missions', 'Gestion des missions')
    .addTag('Reservations Mission', 'Réservations de missions')
    .addTag('Alertes', 'Alertes géographiques')
    .addTag('Geo', 'Géolocalisation et itinéraires')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = Number(process.env.PORT) || 10000;
  await app.listen(port, '0.0.0.0');

  logger.log('========================================');
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger disponible sur http://localhost:${port}/api`);
  logger.log(`📁 Fichiers uploads servis sur /uploads/ via ServeStaticModule`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('========================================');
}

bootstrap().catch((err) => {
  // Log complet si crash au démarrage
  // (utile pour Render)
  // eslint-disable-next-line no-console
  console.error('❌ Erreur fatale au démarrage:', err);
  process.exit(1);
});