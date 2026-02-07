import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // ✅ Override pour GraphQL
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
  
  // ✅ Ne pas utiliser response ici
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  
  // ✅ Gestion des erreurs sans response.status()
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Non authentifié');
    }
    return user;
  }
}
