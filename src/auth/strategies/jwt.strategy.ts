import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
    });
  }

  // ✅ Valider et retourner le payload
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token invalide');
    }
    
    // ✅ Retourner directement l'objet user
    return {
      sub: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      adherentId: payload.adherentId,
      partenaireId: payload.partenaireId,
    };
  }
}
