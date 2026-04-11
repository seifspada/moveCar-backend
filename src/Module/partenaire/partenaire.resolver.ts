import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PartenaireService } from './partenaire.service';
import { PartenaireNavbar } from './dto/partenaire-navbar.model';
import { PartenaireMissionHeader } from './dto/partenaire-mission-header.model';

@Resolver()
export class PartenaireResolver {
  constructor(private readonly partenaireService: PartenaireService) {}

  @Query(() => PartenaireNavbar, { name: 'partenaireNavbar' })
  @UseGuards(JwtAuthGuard)
  async partenaireNavbar(@Context() context: any) {
    const user = context.req.user;
    console.log('🔍 partenaireNavbar - context.req.user:', user);

    //  user.id au lieu de user.sub
    if (!user || !user.id) {
      throw new UnauthorizedException('Token invalide');
    }

    const userId = user.id; //  corrigé
    console.log(' userId extrait (navbar):', userId);

    return this.partenaireService.findNavbarPartenaireByUserId(userId);
  }

 }
