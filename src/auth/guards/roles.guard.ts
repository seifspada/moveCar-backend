import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<string[]>('roles', context.getHandler()) || [];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // ✅ Support GraphQL ET HTTP
    let request: any;
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();
      if (ctx && ctx.req) {
        request = ctx.req;
      }
    } catch (_) {
      // pas un contexte GraphQL
    }

    if (!request) {
      request = context.switchToHttp().getRequest();
    }

    const user = request?.user as any;

    if (!user || !user.role) {
      throw new ForbiddenException('Accès refusé');
    }

    // ✅ user.role est une string directe depuis JwtStrategy
    const userRoleName = user.role?.toUpperCase();

    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === userRoleName,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        "Vous n'avez pas les permissions nécessaires",
      );
    }

    return true;
  }
}
