import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Vérifier que DATABASE_URL existe
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL n\'est pas défini dans .env');
    }

    // Parser l'URL
    const databaseUrl = new URL(process.env.DATABASE_URL);
    
    const pool = new Pool({
      host: databaseUrl.hostname,
      port: parseInt(databaseUrl.port || '5432'),
      user: databaseUrl.username,
      password: decodeURIComponent(databaseUrl.password), // Décoder %20 en espace
      database: databaseUrl.pathname.slice(1),
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      this.logger.error('❌ Erreur de connexion:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
