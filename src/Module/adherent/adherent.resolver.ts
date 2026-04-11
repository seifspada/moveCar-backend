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
    const user = context.req.user;
    console.log('🔍 adherentMe - context.req.user:', user);

    // ✅ Utiliser user.id au lieu de user.sub
    if (!user || !user.id) {
      throw new UnauthorizedException('Token invalide');
    }

    const userId = user.id; // ✅ corrigé
    console.log('✅ userId extrait:', userId);

    return this.adherentService.findPublicByUserId(userId);
  }
}
