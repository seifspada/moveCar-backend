import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    // Log l'erreur complète pour le debugging
    this.logger.error('Exception caught:', exception);

    // Gestion des HttpException de NestJS
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
        const responseMessage = exceptionResponse.message;
        message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : String(responseMessage);
      }
    }
    // Gestion des erreurs Prisma Known
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = HttpStatus.BAD_REQUEST;
      
      switch (exception.code) {
        case 'P2002':
          message = 'Ce rôle existe déjà';
          statusCode = HttpStatus.CONFLICT;
          break;
        case 'P2025':
          message = 'Rôle non trouvé';
          statusCode = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = 'Impossible de supprimer ce rôle car il est utilisé';
          statusCode = HttpStatus.CONFLICT;
          break;
        default:
          message = 'Erreur de base de données';
      }
    }
    // Erreurs de validation Prisma
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Données invalides';
    }
    // Erreurs de connexion Prisma
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Erreur de connexion à la base de données';
    }
    else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Erreur critique de la base de données';
    }
    // Gestion des erreurs Error natives (y compris pg-pool)
    else if (exception instanceof Error) {
      // Erreurs PostgreSQL spécifiques
      if (exception.message.includes('SASL') || exception.message.includes('client password')) {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Erreur de connexion à la base de données';
      } else if (exception.message.includes('Cannot read properties of undefined')) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Données manquantes ou invalides';
      } else {
        message = 'Internal server error'; // Ne pas exposer le message d'erreur en production
      }
    }

    response.status(statusCode).send({
      statusCode,
      message,
    });
  }
}
