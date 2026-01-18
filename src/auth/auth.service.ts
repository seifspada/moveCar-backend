import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

 async register(registerDto: RegisterDto) {
  // Vérifier si l'utilisateur existe déjà
  const existingUser = await this.prisma.user.findUnique({
    where: { email: registerDto.email },
  });

  if (existingUser) {
    throw new BadRequestException('User already exists');
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
      photo: registerDto.photo, // ← AJOUTER CETTE LIGNE
    },
  });

  // Retourner le token JWT
  const payload = { sub: user.id, email: user.email };
  return {
    access_token: this.jwtService.sign(payload),
    user,
  };
}


async login(loginDto: LoginDto) {
  console.log('🔍 Tentative de login pour:', loginDto.email);
  console.log('🔑 Mot de passe reçu:', loginDto.password);

  // Trouver l'utilisateur
  const user = await this.prisma.user.findUnique({
    where: { email: loginDto.email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    console.log('❌ Utilisateur non trouvé');
    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  console.log('✅ Utilisateur trouvé:', user.email);
  console.log('🔐 Hash en base:', user.password);
  console.log('🔐 Longueur du hash:', user.password.length);

  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
  
  console.log('🔓 Mot de passe valide?', isPasswordValid);

  if (!isPasswordValid) {
    console.log('❌ Mot de passe invalide');
    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  console.log('✅ Login réussi pour:', user.email);

  // Générer le token JWT
  const payload = { sub: user.id, email: user.email, roleId: user.roleId };
  const accessToken = this.jwtService.sign(payload);

  // Retourner l'utilisateur sans le mot de passe
  const { password, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
  };
}


  async validateUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
