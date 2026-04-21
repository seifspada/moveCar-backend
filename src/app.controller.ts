import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import type { FastifyRequest } from 'fastify';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Revolution-Conv Backend',
    };
  }

  /**
   * ✅ NOUVEAU: Endpoint qui retourne la configuration publique
   * Aide le frontend à construire les URLs correctes pour les fichiers
   * En local: http://localhost:3000
   * En prod: https://api.example.com
   */
  @Get('config')
  getConfig(@Req() req: FastifyRequest) {
    // Construire l'URL de base à partir des headers
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const apiBase = `${protocol}://${host}`;

    return {
      apiBase,
      environment: process.env.NODE_ENV || 'development',
      uploadsPath: '/uploads',
      timestamp: new Date().toISOString(),
    };
  }
}
