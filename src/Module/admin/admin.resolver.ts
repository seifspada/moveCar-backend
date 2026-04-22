import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminPublic } from './dto/admin-public.model';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Resolver(() => AdminPublic)
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => AdminPublic, { name: 'adminMe' })
  @UseGuards(JwtAuthGuard)
  async adminMe(@Context() context: any) {
    const user = context.req.user;
    console.log('🔍 adminMe - context.req.user:', user);

    if (!user || !user.id) {
      throw new UnauthorizedException('Token invalide');
    }

    const userId = user.id;
    console.log(' userId extrait:', userId);

    return this.adminService.findPublicByUserId(userId);
  }
}