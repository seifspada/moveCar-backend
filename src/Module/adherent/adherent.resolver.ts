// backend/src/Module/adherent/adherent.resolver.ts
import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AdherentService } from './adherent.service';
import { AdherentPublic } from './dto/adherent-public.model';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Resolver(() => AdherentPublic)
export class AdherentResolver {
  constructor(private readonly adherentService: AdherentService) {}

  @Query(() => AdherentPublic, { name: 'adherentMe' })
  @UseGuards(JwtAuthGuard)
  async adherentMe(@Context() context: any) {
    // ✅ Accès au user décodé depuis JWT
    const user = context.req.user;
    
    console.log('🔍 adherentMe - context.req.user:', user);
    
    if (!user || !user.sub) {
      throw new UnauthorizedException('Token invalide');
    }
    
    const userId = user.sub; // ou user.userId selon ton payload
    
    console.log('✅ userId extrait:', userId);
    
    return this.adherentService.findPublicByUserId(userId);
  }
}
