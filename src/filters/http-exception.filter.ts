import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    this.logger.error('Exception caught:', exception);

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
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = HttpStatus.BAD_REQUEST;
      
      // Cast explicite pour accéder aux propriétés
      const code = (exception as Prisma.PrismaClientKnownRequestError).code;
      
      switch (code) {
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
          this.logger.error(`Prisma error code: ${code}`);
      }
    }
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Données invalides';
    }
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Erreur de connexion à la base de données';
      const errorMessage = (exception as Prisma.PrismaClientInitializationError).message;
      this.logger.error('Database connection error:', errorMessage);
    }
    else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Erreur critique de la base de données';
      const errorMessage = (exception as Prisma.PrismaClientRustPanicError).message;
      this.logger.error('Prisma panic error:', errorMessage);
    }
    else if (exception instanceof Error) {
      if (exception.message.includes('SASL') || 
          exception.message.includes('password') ||
          exception.message.includes('authentication')) {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Erreur de connexion à la base de données';
        this.logger.error('Database authentication error');
      } 
      else if (exception.message.includes('Cannot read properties of undefined')) {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Données manquantes ou invalides';
      }
      else if (exception.message.includes('timeout') || 
               exception.message.includes('ETIMEDOUT')) {
        statusCode = HttpStatus.REQUEST_TIMEOUT;
        message = 'Délai d\'attente dépassé';
      }
      else {
        message = process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : exception.message;
      }
    }

    response.status(statusCode).send({
      statusCode,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        timestamp: new Date().toISOString(),
        path: request.url,
      }),
    });
  }
}
