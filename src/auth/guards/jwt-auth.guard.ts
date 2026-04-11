// src/auth/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  getRequest(context: ExecutionContext) {
    // ✅ Détecter proprement le type de contexte
    if (context.getType<string>() === 'graphql') {
      // Contexte GraphQL
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext().req;
    }

    // Contexte REST (Fastify)
    return context.switchToHttp().getRequest();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(
        info?.message || 'Non authentifié'
      );
    }
    return user;
  }
}
