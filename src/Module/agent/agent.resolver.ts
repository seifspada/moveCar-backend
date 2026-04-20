import { Resolver, Query, Args, Int, Context } from '@nestjs/graphql';
import { NotFoundException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentPublic } from './dto/agent-public.model';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Resolver(() => AgentPublic)
export class AgentResolver {
  constructor(private readonly agentService: AgentService) {}
  
@Query(() => AgentPublic, { name: 'agentMe' })
@UseGuards(JwtAuthGuard)
async agentMe(@Context() context: any) {
  const user = context.req.user;
  console.log('🔍 agentMe - context.req.user:', user);

  if (!user || !user.id) {
    throw new UnauthorizedException('Token invalide');
  }

  const userId = user.id;
  console.log('✅ userId extrait:', userId);

  return this.agentService.findPublicByUserId(userId);
}

}