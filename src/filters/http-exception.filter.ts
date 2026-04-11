// src/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // ✅ 1. Détecter le type de contexte (HTTP ou GraphQL)
    const contextType = host.getType<GqlContextType>();

    // ✅ 2. Si c'est GraphQL, laisser Apollo gérer
    if (contextType === 'graphql') {
      this.logger.error('GraphQL Error:', exception);
      throw exception;
    }

    // ✅ 3. Sinon, traiter comme une requête HTTP (Fastify)
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // ✅ 4. Vérifier que response existe
    if (!response || typeof response.status !== 'function') {
      this.logger.error('Invalid response object:', exception);
      throw exception;
    }

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    // ✅ 5. HttpException NestJS
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const responseMessage = (exceptionResponse as any).message;
        message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : String(responseMessage);
      }
    }
    // ✅ 6. Erreurs Prisma
    else if (exception && typeof exception === 'object' && 'code' in exception) {
      const prismaError = exception as { code: string; meta?: any };
      statusCode = HttpStatus.BAD_REQUEST;

      switch (prismaError.code) {
        case 'P2002':
          message = 'Cette ressource existe déjà';
          statusCode = HttpStatus.CONFLICT;
          break;
        case 'P2025':
          message = 'Ressource non trouvée';
          statusCode = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = 'Impossible de supprimer cette ressource car elle est utilisée';
          statusCode = HttpStatus.CONFLICT;
          break;
        case 'P2014':
          message = 'Relation invalide dans les données';
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        default:
          message = 'Erreur de base de données';
          this.logger.error(`Prisma error code: ${prismaError.code}`);
      }
    }
    // ✅ 7. Erreurs de validation Prisma
    else if (exception instanceof Error && exception.message.includes('Invalid `prisma')) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Données invalides';
    }
    // ✅ 8. Erreurs de connexion DB
    else if (
      exception instanceof Error &&
      (exception.message.includes("Can't reach database") ||
        exception.message.includes('connection'))
    ) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Erreur de connexion à la base de données';
      this.logger.error('Database connection error:', exception.message);
    }
    // ✅ 9. Autres erreurs
    else if (exception instanceof Error) {
      if (exception.message.includes('SASL') || exception.message.includes('password')) {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Erreur de connexion à la base de données';
        this.logger.error('Database authentication error');
      } else if (exception.message.includes('Cannot read properties of undefined')) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Données manquantes ou invalides';
      } else if (exception.message.includes('timeout') || exception.message.includes('ETIMEDOUT')) {
        statusCode = HttpStatus.REQUEST_TIMEOUT;
        message = "Délai d'attente dépassé";
      } else {
        message =
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : exception.message;
      }
    }

    // ✅ 10. Logging intelligent par niveau de sévérité
    if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      // 401/403 = comportement normal, juste un warn
      this.logger.warn(
        `⚠️  [${statusCode}] ${request.method} ${request.url} — ${message}`,
      );
    } else if (
      exception instanceof NotFoundException ||
      statusCode === 404
    ) {
      // 404 = ressource introuvable, log minimal
      this.logger.warn(
        `🔍 [404] ${request.method} ${request.url} — ${message}`,
      );
    } else if (statusCode >= 500) {
      // 500+ = vraie erreur critique
      this.logger.error(`Exception caught:`);
      this.logger.error(exception);
    } else {
      // 400, 409, etc. = erreur client, log simple
      this.logger.warn(
        `⚡ [${statusCode}] ${request.method} ${request.url} — ${message}`,
      );
    }

    // ✅ 11. Envoyer la réponse HTTP
    response.status(statusCode).send({
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
