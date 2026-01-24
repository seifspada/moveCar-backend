import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { join } from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import multipart, { MultipartFile } from '@fastify/multipart';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function saveFiles(demandeId: number, files: Record<string, MultipartFile[]>) {
  const basePath = join(process.cwd(), 'uploads', 'demandes', String(demandeId));

  for (const [key, fileArray] of Object.entries(files)) {
    if (!fileArray?.length) continue;

    const typeDir = join(basePath, key);
    if (!existsSync(typeDir)) {
      await fs.mkdir(typeDir, { recursive: true }); // ✅
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

  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    logger.error('❌ JWT_SECRET non défini dans .env');
    process.exit(1);
  }

  logger.log("✅ Variables d'environnement chargées");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // ✅ multipart plugin
  await app.register(multipart as any, {
    attachFieldsToBody: 'keyValues',
    limits: { fileSize: 10 * 1024 * 1024 },

    // ✅ correction: on force la structure “fichier” attachée au body
    // sinon tu peux te retrouver avec mimetype undefined / valeur string/buffer non conforme [web:24]
    onFile: async (part: any) => {
      part.value = {
        filename: part.filename,
        mimetype: part.mimetype,
        encoding: part.encoding,
        value: await part.toBuffer(),
      };
    },
  }); // attachFieldsToBody:'keyValues' + onFile = recommandé par fastify-multipart [web:24]

  // CORS
  const isDevelopment = process.env.NODE_ENV === 'development';

  app.enableCors({
    origin: isDevelopment
      ? '*'
      : [
          'http://localhost:3001',
          'http://192.168.56.1:3001',
          'http://127.0.0.1:3001',
        ],
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
      isDevelopment ? 'development - all origins' : 'production - restricted'
    })`,
  );

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Exception filter global
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API TransConvoy')
    .setDescription("API de gestion des rôles, utilisateurs et authentification")
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log('========================================');
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger disponible sur http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('========================================');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Erreur fatale au démarrage:', err);
  process.exit(1);
});
