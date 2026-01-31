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
  async login(loginDto: LoginDto) {
    console.log('🔍 Tentative de login pour:', loginDto.email);

    // Trouver l'utilisateur avec son adherent (si existe)
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
          select: {
            id: true,
            name: true,
          },
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
      },
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    console.log('✅ Utilisateur trouvé:', user.email);

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Mot de passe invalide');
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    console.log('✅ Login réussi pour:', user.email);

    // Générer le token JWT
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      adherentId: user.adherent?.id, // Inclure l'adherentId si existe
    };
    const accessToken = this.jwtService.sign(payload);

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  // ✅ ValidateUser - Avec support adherent
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
          select: {
            id: true,
            name: true,
          },
        },
        adherent: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            numeroAdherent: true,
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
      throw new BadRequestException('Erreur lors de l\'envoi de l\'email: ' + error.message);
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
}
