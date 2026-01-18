import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
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
      photo: createUserDto.photo || '/default-avatar.png', // ← AJOUTER avec valeur par défaut
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
    // Vérifier si l'utilisateur existe
    await this.findOne(id);

    // Si un nouveau rôle est fourni, vérifier qu'il existe
    if (updateUserDto.roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (!roleExists) {
        throw new BadRequestException(`Le rôle avec l'ID ${updateUserDto.roleId} n'existe pas`);
      }
    }

    // Si un nouveau mot de passe est fourni, le hasher
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Cet email est déjà utilisé');
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    // Vérifier si l'utilisateur existe
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}
