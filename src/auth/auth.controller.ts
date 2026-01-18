import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import * as bcrypt from 'bcrypt'; // ✅ AJOUTEZ CETTE LIGNE

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Récupérer le profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }


  @Post('reset-password-dev')
@ApiOperation({ summary: 'Reset password (DEV ONLY)' })
async resetPasswordDev(@Body() body: { email: string; newPassword: string }) {
  // ⚠️ À SUPPRIMER EN PRODUCTION
  const hashedPassword = await bcrypt.hash(body.newPassword, 10);

  const user = await this.authService['prisma'].user.update({
    where: { email: body.email },
    data: { password: hashedPassword },
    include: { role: true },
  });

  // Vérifier immédiatement
  const isValid = await bcrypt.compare(body.newPassword, hashedPassword);

  return {
    message: 'Mot de passe réinitialisé',
    email: user.email,
    role: user.role.name,
    verification: isValid ? 'OK' : 'ERREUR',
  };
}

}
