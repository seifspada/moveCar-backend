import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    if (!createRoleDto || !createRoleDto.name) {
      throw new BadRequestException('Le nom du rôle est requis');
    }

    try {
      return await this.prisma.role.create({
        data: {
          name: createRoleDto.name,
        },
      });
    } catch (error) {
      // ✅ Vérification compatible Prisma 7
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException('Ce rôle existe déjà');
        }
      }
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.role.findMany({
        include: { 
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          } 
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { 
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        } 
      },
    });

    if (!role) {
      throw new NotFoundException(`Le rôle avec l'ID ${id} n'existe pas`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    try {
      return await this.prisma.role.update({
        where: { id },
        data: updateRoleDto,
      });
    } catch (error) {
      // ✅ Vérification compatible Prisma 7
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException('Ce nom de rôle est déjà utilisé');
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    try {
      return await this.prisma.role.delete({
        where: { id },
      });
    } catch (error) {
      // ✅ Vérification compatible Prisma 7
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2003') {
          throw new ConflictException('Impossible de supprimer ce rôle car il est utilisé');
        }
      }
      throw error;
    }
  }
}
