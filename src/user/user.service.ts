import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roleId: createUserDto.roleId,
        photo: createUserDto.photo || '/default-avatar.png',
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
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
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`L'utilisateur avec l'ID ${id} n'existe pas`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    if (updateUserDto.roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (!roleExists) {
        throw new BadRequestException(`Le rôle avec l'ID ${updateUserDto.roleId} n'existe pas`);
      }
    }

    const dataToUpdate: any = { ...updateUserDto };
    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
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
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // ✅ Vérification compatible Prisma 7 (sans import runtime/library)
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException('Cet email est déjà utilisé');
        }
      }
      throw error;
    }
  }
async remove(id: number) {
  await this.findOne(id);

  return this.prisma.$transaction(async (tx) => {
    const adherent = await tx.adherent.findFirst({
      where: { userId: id },
      select: { id: true, demandeAdhesionId: true },
    });

    if (adherent?.demandeAdhesionId) {
      const docIds = (
        await tx.document.findMany({
          where: { demandeAdhesionId: adherent.demandeAdhesionId },
          select: { id: true },
        })
      ).map((d) => d.id);

      if (docIds.length > 0) {
        await tx.fichierDocument.deleteMany({
          where: { documentId: { in: docIds } },
        });
      }

      await tx.document.deleteMany({
        where: { demandeAdhesionId: adherent.demandeAdhesionId },
      });
    }

    if (adherent) {
      // ✅ Supprimer reservations_mission AVANT adherent
      await tx.$executeRaw`
        DELETE FROM reservations_mission WHERE "adherentId" = ${adherent.id}
      `;

      await tx.adherent.delete({ where: { id: adherent.id } });
    }

    if (adherent?.demandeAdhesionId) {
      await tx.demandeAdhesion.delete({
        where: { id: adherent.demandeAdhesionId },
      });
    }

    return tx.user.delete({
      where: { id },
      select: { id: true, name: true, email: true },
    });
  });
}
}
