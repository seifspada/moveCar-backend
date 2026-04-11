import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAdminDto: CreateAdminDto) {
    const existing = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
    });

    if (existing) {
      throw new ConflictException('Un admin avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // 0. Récupérer le rôle "admin" dynamiquement
      const roleAdmin = await tx.role.findUnique({
        where: { name: 'admin' },
      });

      if (!roleAdmin) {
        throw new NotFoundException("Le rôle 'admin' n'existe pas en base");
      }

      // 1. Créer le User avec le rôle admin connecté
      const user = await tx.user.create({
        data: {
          email: createAdminDto.email,
          name: createAdminDto.nom,
          password: hashedPassword,
          role: {
            connect: { id: roleAdmin.id }, // ✅ relation correcte
          },
        },
      });

      // 2. Créer l'Admin lié au User
      return tx.admin.create({
        data: {
          userId: user.id,
          nom: createAdminDto.nom,
          email: createAdminDto.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          nom: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.admin.findMany({
      select: { id: true, nom: true, email: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true, nom: true, email: true, createdAt: true, updatedAt: true },
    });

    if (!admin) {
      throw new NotFoundException(`Admin #${id} introuvable`);
    }

    return admin;
  }

  async update(id: number, updateAdminDto: UpdateAdminDto) {
    await this.findOne(id);

    if (updateAdminDto.password) {
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    return this.prisma.admin.update({
      where: { id },
      data: updateAdminDto,
      select: { id: true, nom: true, email: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.admin.delete({
      where: { id },
      select: { id: true, nom: true, email: true },
    });
  }

  async findPublicByUserId(userId: number) {
    console.log('🔍 Recherche admin pour userId:', userId);

    const admin = await this.prisma.admin.findUnique({
      where: { userId }, // ✅ correction : cherche par userId, pas id
      select: {
        nom: true,
        email: true,
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin introuvable pour userId: ${userId}`);
    }

    console.log('✅ Admin trouvé:', admin.nom);

    return {
      nom: admin.nom,
      email: admin.email,
    };
  }
}