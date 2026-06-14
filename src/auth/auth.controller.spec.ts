import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// ─── Mock AuthService ─────────────────────────────────────────────────────────

const mockAuthService = {
  register:          jest.fn(),
  login:             jest.fn(),
  validateUser:      jest.fn(),
  forgetPassword:    jest.fn(),
  verifyResetCode:   jest.fn(),
  resetPassword:     jest.fn(),
  logout:            jest.fn(),
};

// ─── Données de test ──────────────────────────────────────────────────────────

const mockUserResponse = {
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    roleId: 2,
    photo: '/uploads/avatar.jpg',
    role: { id: 2, name: 'adherent' },
  },
  accessToken: 'mock-jwt-token',
};

const mockAdminResponse = {
  user: {
    id: 1,
    nom: 'Admin',
    email: 'admin@movecar.com',
    role: { id: null, name: 'admin' },
  },
  accessToken: 'mock-admin-jwt-token',
};

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      // Désactiver JwtAuthGuard pour les tests du controller
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/register
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/register', () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      photo: '/uploads/avatar.jpg',
      roleId: 2,
    };

    it('✅ devrait appeler authService.register et retourner le résultat', async () => {
      const expected = { access_token: 'mock-jwt-token', user: registerDto };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expected);
    });

    it('❌ devrait propager l\'exception si le service échoue', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Email déjà utilisé'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email déjà utilisé',
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/login — User
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/login — User', () => {
    it('✅ devrait connecter un user et retourner un accessToken', async () => {
      mockAuthService.login.mockResolvedValue(mockUserResponse);

      const result = await controller.login({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('john@example.com');
    });

    it('❌ devrait propager UnauthorizedException si identifiants invalides', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Email ou mot de passe incorrect'),
      );

      await expect(
        controller.login({ email: 'bad@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/login — Admin (admin@movecar.com / Admin123!)
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/login — Admin', () => {
    it('✅ devrait connecter l\'admin avec admin@movecar.com / Admin123!', async () => {
      mockAuthService.login.mockResolvedValue(mockAdminResponse);

      const result = await controller.login({
        email: 'admin@movecar.com',
        password: 'Admin123!',
      });

      expect(result.accessToken).toBe('mock-admin-jwt-token');
      expect(result.user.role.name).toBe('admin');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /auth/profile
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /auth/profile', () => {
    it('✅ devrait retourner le profil de l\'utilisateur connecté', async () => {
      const profileData = { id: 1, name: 'John Doe', email: 'john@example.com' };
      mockAuthService.validateUser.mockResolvedValue(profileData);

      // Simuler @CurrentUser() qui injecte { id: 1 }
      const result = await controller.getProfile({ id: 1 });

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(1);
      expect(result).toEqual(profileData);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/forget-password
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/forget-password', () => {
    it('✅ devrait envoyer un code de réinitialisation', async () => {
      const expected = { message: 'Code de vérification envoyé à votre email' };
      mockAuthService.forgetPassword.mockResolvedValue(expected);

      const result = await controller.forgetPassword({
        email: 'john@example.com',
      });

      expect(mockAuthService.forgetPassword).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(result.message).toContain('email');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/verify-reset-code
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/verify-reset-code', () => {
    it('✅ devrait valider un code correct', async () => {
      mockAuthService.verifyResetCode.mockResolvedValue({
        message: 'Code vérifié avec succès',
        verified: true,
      });

      const result = await controller.verifyResetCode({
        email: 'john@example.com',
        code: '123456',
      });

      expect(result.verified).toBe(true);
    });

    it('❌ devrait propager BadRequestException si code invalide', async () => {
      mockAuthService.verifyResetCode.mockRejectedValue(
        new Error('Code invalide ou expiré'),
      );

      await expect(
        controller.verifyResetCode({ email: 'john@example.com', code: '000000' }),
      ).rejects.toThrow('Code invalide ou expiré');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/reset-password
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/reset-password', () => {
    it('✅ devrait réinitialiser le mot de passe', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Mot de passe réinitialisé avec succès',
      });

      const result = await controller.resetPassword({
        email: 'john@example.com',
        code: '123456',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toContain('succès');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POST /auth/logout
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /auth/logout', () => {
    it('✅ devrait déconnecter l\'utilisateur avec un token valide', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Déconnexion réussie',
        success: true,
      });

      const result = await controller.logout('Bearer mock-jwt-token');

      expect(mockAuthService.logout).toHaveBeenCalledWith('mock-jwt-token');
      expect(result.success).toBe(true);
    });

    it('❌ devrait lever UnauthorizedException si le header Authorization est absent', async () => {
      await expect(
        controller.logout(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ devrait lever UnauthorizedException si le token est vide', async () => {
      await expect(
        controller.logout('Bearer '),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});