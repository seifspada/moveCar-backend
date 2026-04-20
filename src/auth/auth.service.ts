import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/Module/email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    private tokenBlacklist = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // ✅ Register - Garder par défaut (simple création User)
  async register(registerDto: RegisterDto) {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Créer l'utilisateur avec la photo
    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        roleId: registerDto.roleId,
        photo: registerDto.photo,
      },
    });

    // Retourner le token JWT
    const payload = { sub: user.id, email: user.email, roleId: user.roleId };
    const { password, ...userWithoutPassword } = user;

    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }

  // ✅ Login - Avec support adherent
// auth.service.ts

async login(loginDto: LoginDto) {
  console.log('🔍 Tentative de login pour:', loginDto.email);

  const user = await this.prisma.user.findUnique({
    where: { email: loginDto.email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      roleId: true,
      photo: true,
      role: {
        select: { id: true, name: true },
      },
      adherent: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          numeroAdherent: true,
          dateNaissance: true,
          telephone: true,
          adresse: true,
          codePostal: true,
          ville: true,
          photoUrl: true,
        },
      },
      partenaire: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          entiteGroupe: true,
          entiteAgence: true,
          email: true,
          telephone: true,
          codePartenaire: true,
          estActif: true,
        },
      },
      agent: {
        select: {
          id: true,
          agenceId: true,
          photo: true,
          nom: true,
          prenom: true,
          isProfileCompleted: true,
          agence: {
            select: {
              id: true,
              nom: true,
              partenaire: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  // ✅ Guard 1 — user inexistant → tenter admins
  if (!user) {
    console.log('🔍 Non trouvé dans users, tentative dans admins...');

    const admin = await this.prisma.admin.findUnique({
      where: { email: loginDto.email },
      select: { id: true, nom: true, email: true, password: true },
    });

    if (!admin) {
      console.log('❌ Utilisateur non trouvé pour:', loginDto.email);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isAdminPasswordValid = await bcrypt.compare(loginDto.password, admin.password);
    if (!isAdminPasswordValid) {
      console.log('❌ Mot de passe invalide pour admin:', admin.email);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    console.log('✅ Login admin réussi pour:', admin.email);

    const { password, ...adminWithoutPassword } = admin;
    return {
      user: { ...adminWithoutPassword, role: { id: null, name: 'admin' } },
      accessToken: this.jwtService.sign({
        sub: admin.id,
        email: admin.email,
        roleId: null,
        role: 'admin',
        adherentId: null,
        partenaireId: null,
        agentId: null,
        agenceId: null,
      }),
    };
  }

  console.log('✅ Utilisateur trouvé:', user.email, '| Rôle:', user.role?.name);

  // ✅ Guard 2 — profil non complété (password null ou vide)
  if (!user.password) {
    console.log('⚠️ Profil non complété pour:', user.email);
    throw new UnauthorizedException(
      'Profil non complété — veuillez utiliser le lien reçu par email',
    );
  }

  // ✅ Guard 3 — agent dont le profil n'est pas encore complété
  if (user.agent && !user.agent.isProfileCompleted) {
    console.log('⚠️ Agent profil incomplet pour:', user.email);
    throw new UnauthorizedException(
      'Profil agent non complété — veuillez utiliser le lien reçu par email',
    );
  }

  // ✅ Guard 4 — vérification password
  const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

  if (!isPasswordValid) {
    console.log('❌ Mot de passe invalide pour:', user.email);
    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  console.log('✅ Login réussi pour:', user.email, '| Rôle:', user.role?.name);

  const payload = {
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    role: user.role?.name ?? null,
    adherentId: user.adherent?.id ?? null,
    partenaireId:
      user.partenaire?.id ?? user.agent?.agence?.partenaire?.id ?? null,
    agentId: user.agent?.id ?? null,
    agenceId: user.agent?.agenceId ?? null,
  };

  const accessToken = this.jwtService.sign(payload);
  const { password, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
  };
}


// ============================================

async validateUser(userId: number) {
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      photo: true,
      role: {
        select: { id: true, name: true },
      },
      adherent: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          numeroAdherent: true,
        },
      },
      partenaire: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          codePartenaire: true,
          estActif: true,
        },
      },
      agent: {
        select: {
          id: true,
          agenceId: true,
          nom: true,
          prenom: true,
          photo: true,
          isProfileCompleted: true,
          agence: {
            select: {
              id: true,
              nom: true,
              partenaire: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
}



  // ✅ ForgetPassword - Pas de changement
  async forgetPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email');
    }

    // Générer un code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hasher le code pour le stocker
    const hashedCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Expiration dans 1 heure
    const resetPasswordExpires = new Date(Date.now() + 3600000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedCode,
        resetPasswordExpires,
      },
    });

   try {
  await this.emailService.sendPasswordResetCode(email, resetCode);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new BadRequestException('Erreur lors de l\'envoi de l\'email: ' + message);
}

    return { message: 'Code de vérification envoyé à votre email' };
  }

  // ✅ VerifyResetCode - Pas de changement
  async verifyResetCode(email: string, code: string) {
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        resetPasswordToken: hashedCode,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    return { message: 'Code vérifié avec succès', verified: true };
  }

  // ✅ ResetPassword - Pas de changement
  async resetPassword(email: string, code: string, newPassword: string) {
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        resetPasswordToken: hashedCode,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }



  async logout(token: string) {
    console.log('🔍 Tentative de logout');

    // Ajouter le token à la blacklist
    this.tokenBlacklist.add(token);

    console.log('✅ Token ajouté à la blacklist');

    return {
      message: 'Déconnexion réussie',
      success: true,
    };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }
}
