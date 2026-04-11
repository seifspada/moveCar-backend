// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    // ✅ Vérifier si c'est GraphQL en essayant de créer le contexte
    const gqlContext = GqlExecutionContext.create(context);
    
    // ✅ Si getContext() fonctionne, c'est GraphQL
    const contextObj = gqlContext.getContext();
    
    if (contextObj && contextObj.req) {
      // C'est GraphQL
      return contextObj.req.user;
    }
    
    // Sinon, c'est HTTP
    const httpRequest = context.switchToHttp().getRequest();
    return httpRequest?.user;
  },
);
