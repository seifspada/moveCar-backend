import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Vérifier DATABASE_URL
  if (!process.env.DATABASE_URL) {
    logger.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }

  // Vérifier JWT_SECRET
  if (!process.env.JWT_SECRET) {
    logger.error('❌ JWT_SECRET non défini dans .env');
    process.exit(1);
  }

  logger.log('✅ Variables d\'environnement chargées');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // ✅ ACTIVER CORS - Méthode NestJS (compatible avec Fastify)
  app.enableCors({
    origin: [
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

  logger.log('✅ CORS activé pour http://localhost:3001');

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Exception filter global
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('API TransConvoy')
    .setDescription('API de gestion des rôles, utilisateurs et authentification')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Entrez votre token JWT',
      },
      'Bearer'
    )
    .addServer('http://localhost:3000', 'Serveur de développement')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log('🚀 ========================================');
  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 Swagger disponible sur http://localhost:${port}/api`);
  logger.log(`✅ CORS activé pour le frontend sur port 3001`);
  logger.log('🚀 ========================================');
}

bootstrap();
