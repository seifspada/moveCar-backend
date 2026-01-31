// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { forgetPasswordDto } from './dto/forget-password.dto';

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
  // Recharger l'utilisateur avec les données adherent
  return this.authService.validateUser(user.id);
}

  // ============================================
  // FLUX DE RÉINITIALISATION DE MOT DE PASSE
  // ============================================

  @Post('forget-password')
  @ApiOperation({ summary: 'Étape 1: Demander un code de réinitialisation' })
  @ApiResponse({ status: 200, description: 'Code envoyé par email' })
  @ApiResponse({ status: 404, description: 'Email non trouvé en base de données' })
  async forgetPassword(@Body() forgetPasswordDto: forgetPasswordDto) {
    return this.authService.forgetPassword(forgetPasswordDto.email);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Étape 2: Vérifier le code reçu par email' })
  @ApiResponse({ status: 200, description: 'Code vérifié avec succès' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(
      verifyResetCodeDto.email,
      verifyResetCodeDto.code,
    );
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Étape 3: Changer le mot de passe avec le code validé' })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé avec succès' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
  }
}