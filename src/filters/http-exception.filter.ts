import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

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
    // ✅ Vérification Prisma compatible avec Prisma 7
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
    // ✅ Erreurs de validation Prisma (message commence par "Invalid")
    else if (exception instanceof Error && exception.message.includes('Invalid `prisma')) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Données invalides';
    }
    // ✅ Erreurs de connexion Prisma
    else if (exception instanceof Error && 
             (exception.message.includes('Can\'t reach database') || 
              exception.message.includes('connection'))) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Erreur de connexion à la base de données';
      this.logger.error('Database connection error:', exception.message);
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
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
