import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../Module/email/email.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// ─── Mocks globaux ────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  password: '$2b$10$hashedpassword', // sera remplacé par bcrypt.hash dans certains tests
  roleId: 2,
  photo: '/uploads/avatar.jpg',
  role: { id: 2, name: 'adherent' },
  adherent: null,
  partenaire: null,
  agent: null,
  resetPasswordToken: null,
  resetPasswordExpires: null,
};

const mockAdmin = {
  id: 1,
  nom: 'Admin',
  email: 'admin@movecar.com',
  password: '$2b$10$hashedAdminPassword',
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  admin: {
    findUnique: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockEmailService = {
  sendPasswordResetCode: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService,  useValue: mockPrismaService },
        { provide: JwtService,     useValue: mockJwtService },
        { provide: EmailService,   useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Réinitialiser tous les mocks entre chaque test
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTER
  // ══════════════════════════════════════════════════════════════════════════
  describe('register()', () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      photo: '/uploads/avatar.jpg',
      roleId: 2,
    };

    it('✅ devrait créer un utilisateur et retourner un token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null); // pas de doublon
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password'); // mot de passe masqué
    });

    it('❌ devrait lever BadRequestException si l\'email existe déjà', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser); // doublon

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN — USER
  // ══════════════════════════════════════════════════════════════════════════
  describe('login() — User', () => {
    it('✅ devrait connecter un user avec des identifiants valides', async () => {
      const plainPassword = 'password123';
      const hashed = await bcrypt.hash(plainPassword, 10);
      const userWithHash = { ...mockUser, password: hashed };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithHash);

      const result = await service.login({
        email: 'john@example.com',
        password: plainPassword,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user).not.toHaveProperty('password');
    });

    it('❌ devrait lever UnauthorizedException si le mot de passe est incorrect', async () => {
      const hashed = await bcrypt.hash('correctPassword', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashed,
      });

      await expect(
        service.login({ email: 'john@example.com', password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ devrait lever UnauthorizedException si le profil n\'est pas complété (password null)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(
        service.login({ email: 'john@example.com', password: 'anything' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ devrait lever UnauthorizedException si agent non complété', async () => {
      const hashed = await bcrypt.hash('pass', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashed,
        agent: { id: 5, isProfileCompleted: false, agenceId: 1, agence: null },
      });

      await expect(
        service.login({ email: 'john@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN — ADMIN  (email: admin@movecar.com / Admin123!)
  // ══════════════════════════════════════════════════════════════════════════
  describe('login() — Admin', () => {
    const adminCredentials = {
      email: 'admin@movecar.com',
      password: 'Admin123!',
    };

    it('✅ devrait connecter l\'admin avec les bons identifiants', async () => {
      const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
      const adminWithHash = { ...mockAdmin, password: hashedAdminPassword };

      // User non trouvé → on passe à la table admin
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.findUnique.mockResolvedValue(adminWithHash);

      const result = await service.login(adminCredentials);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.role.name).toBe('admin');
      expect(result.user).not.toHaveProperty('password');
    });

    it('❌ devrait lever UnauthorizedException si mot de passe admin incorrect', async () => {
      const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.findUnique.mockResolvedValue({
        ...mockAdmin,
        password: hashedAdminPassword,
      });

      await expect(
        service.login({ email: 'admin@movecar.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('❌ devrait lever UnauthorizedException si ni user ni admin trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@movecar.com', password: 'xxx' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FORGET PASSWORD
  // ══════════════════════════════════════════════════════════════════════════
  describe('forgetPassword()', () => {
    it('✅ devrait envoyer un code de réinitialisation par email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.forgetPassword('john@example.com');

      expect(mockEmailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'john@example.com',
        expect.any(String), // le code à 6 chiffres
      );
      expect(result.message).toContain('email');
    });

    it('❌ devrait lever NotFoundException si email inconnu', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgetPassword('unknown@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('❌ devrait lever BadRequestException si l\'envoi d\'email échoue', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetCode.mockRejectedValueOnce(
        new Error('SMTP error'),
      );

      await expect(
        service.forgetPassword('john@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFY RESET CODE
  // ══════════════════════════════════════════════════════════════════════════
  describe('verifyResetCode()', () => {
    it('✅ devrait valider un code correct non expiré', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyResetCode('john@example.com', '123456');

      expect(result.verified).toBe(true);
    });

    it('❌ devrait lever BadRequestException si code invalide ou expiré', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyResetCode('john@example.com', '000000'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ══════════════════════════════════════════════════════════════════════════
  describe('resetPassword()', () => {
    it('✅ devrait réinitialiser le mot de passe avec un code valide', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.resetPassword(
        'john@example.com',
        '123456',
        'newPassword123',
      );

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            resetPasswordToken: null,
            resetPasswordExpires: null,
          }),
        }),
      );
      expect(result.message).toContain('succès');
    });

    it('❌ devrait lever BadRequestException si code invalide', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('john@example.com', 'bad-code', 'newPass'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOGOUT & BLACKLIST
  // ══════════════════════════════════════════════════════════════════════════
  describe('logout() + isTokenBlacklisted()', () => {
    it('✅ devrait ajouter le token à la blacklist', async () => {
      const token = 'my-valid-jwt-token';

      expect(service.isTokenBlacklisted(token)).toBe(false);

      await service.logout(token);

      expect(service.isTokenBlacklisted(token)).toBe(true);
    });

    it('✅ devrait retourner false pour un token non blacklisté', () => {
      expect(service.isTokenBlacklisted('unknown-token')).toBe(false);
    });

    it('✅ devrait retourner un message de succès', async () => {
      const result = await service.logout('any-token');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Déconnexion');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATE USER
  // ══════════════════════════════════════════════════════════════════════════
  describe('validateUser()', () => {
    it('✅ devrait retourner l\'utilisateur sans mot de passe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(1);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('✅ devrait retourner null si utilisateur introuvable', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(999);
      expect(result).toBeNull();
    });
  });
});