import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('🔐 JWT Payload reçu:', payload);

    // ✅ Si c'est un admin → chercher dans la table admins
    if (payload.role === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, nom: true, email: true },
      });

      if (!admin) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      const result = {
        id: admin.id,
        sub: admin.id,
        email: admin.email,
        roleId: null,
        role: 'admin',
        adherentId: null,
        partenaireId: null,
        agentId: null,
        agenceId: null,
        adminId: admin.id,
      };

      console.log('✅ Admin validé:', result.email, '| Rôle:', result.role, '| AdminId:', result.adminId);
      return result;
    }

    // ✅ Sinon → chercher dans users comme avant
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        adherent: { select: { id: true } },
        partenaire: { select: { id: true } },
        agent: {
          include: {
            agence: {
              include: {
                partenaire: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // ✅ role depuis DB ou depuis payload en fallback
    const roleName = user.role?.name ?? payload.role ?? null;

    if (!roleName) {
      throw new UnauthorizedException('Rôle utilisateur introuvable');
    }

    const result = {
      id: user.id,
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      role: roleName,
      adherentId: user.adherent?.id ?? null,
      partenaireId:
        user.partenaire?.id ??
        user.agent?.agence?.partenaire?.id ??
        null,
      agentId: user.agent?.id ?? null,
      agenceId: user.agent?.agenceId ?? null,
      adminId: null,
    };

    console.log('✅ User validé:', result.email, '| Rôle:', result.role, '| AdminId:', result.adminId);
    return result;
  }
}