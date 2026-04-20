import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { AgenceType } from './types/agence.type';
import { EmailService } from '../email/email.service';
import { AgentService } from '../agent/agent.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly agentService: AgentService, // 🟡 injecté pour vérifier doublon email dans agents
  ) {}

  // AgencyService.create
async create(dto: CreateAgencyDto, partenaireId: number): Promise<AgenceType> {

  // 1. Vérifier unicité email
  if (dto.email) {
    const existingAgence = await this.prisma.agence.findFirst({
      where: { email: dto.email },
    });
    if (existingAgence) {
      throw new ConflictException(`Une agence avec l'email "${dto.email}" existe déjà`);
    }

    const existingAgent = await this.prisma.agent.findUnique({
      where: { email: dto.email },
    });
    if (existingAgent) {
      throw new ConflictException(`Un agent avec l'email "${dto.email}" existe déjà`);
    }

    // ✅ Vérifier aussi dans users
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException(`Un compte avec l'email "${dto.email}" existe déjà`);
    }
  }

  // 2. Générer profileToken
  const profileToken = crypto.randomBytes(32).toString('hex');
  const profileTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 3. Récupérer le partenaire
  const partenaire = await this.prisma.partenaire.findUnique({
    where: { id: partenaireId },
    select: { codePartenaire: true },
  });
  if (!partenaire) {
    throw new NotFoundException(`Partenaire #${partenaireId} introuvable`);
  }

  const { entiteGroupe: _eg, ...agenceData } = dto;

  // 4. Transaction : créer agence + User + agent
  const agence = await this.prisma.$transaction(async (tx) => {
    const nouvelleAgence = await tx.agence.create({
      data: { ...agenceData, partenaireId },
    });

    if (dto.email) {
      // ✅ Récupérer le rôle agent
      const roleAgent = await tx.role.findUnique({
        where: { name: 'agent' },
      });
      if (!roleAgent) throw new NotFoundException('Rôle agent introuvable en base');

      // ✅ Créer le User dès maintenant (sans password — sera mis à jour dans completeProfile)
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          name: nouvelleAgence.nom,       // nom de l'agence en attendant
          password: null,                   // vide — sera mis à jour dans completeProfile
          roleId: roleAgent.id,
        },
      });

      // ✅ Créer l'agent lié au User
      await tx.agent.create({
        data: {
          email: dto.email,
          profileToken,
          profileTokenExpiresAt,
          isProfileCompleted: false,
          agenceId: nouvelleAgence.id,
          userId: newUser.id,             // ✅ lier dès la création
        },
      });
    }

    return nouvelleAgence;
  });

  // 5. Envoyer email
  if (agence.email) {
    try {
      await this.emailService.sendAgenceCreatedCompleteProfile({
        email: agence.email,
        nomAgence: agence.nom,
        ville: agence.ville ?? undefined,
        profileToken,
        codePartenaire: partenaire.codePartenaire ?? '',
      });
    } catch (error) {
  console.error('❌ Erreur envoi email agence créée:', {
    agenceId: agence.id,
    email: agence.email,
    error: error instanceof Error ? error.message : String(error), // ✅
  });
}
  }

  return agence;
}


  async findAll(partenaireId: number): Promise<AgenceType[]> {
    return this.prisma.agence.findMany({
      where: { partenaireId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, partenaireId: number): Promise<AgenceType> {
    const agence = await this.prisma.agence.findFirst({
      where: { id, partenaireId },
    });
    if (!agence) {
      throw new NotFoundException(`Agence #${id} introuvable`);
    }
    return agence;
  }

  async update(
    id: number,
    dto: UpdateAgencyDto,
    partenaireId: number,
  ): Promise<AgenceType> {
    await this.findOne(id, partenaireId);
    return this.prisma.agence.update({
      where: { id },
      data: { ...dto },
    });
  }

async remove(id: number, partenaireId: number): Promise<AgenceType> {
  await this.findOne(id, partenaireId);

  return this.prisma.agence.delete({
    where: { id },
  });
}

async toggleActive(id: number, partenaireId: number): Promise<AgenceType> {
  const agence = await this.findOne(id, partenaireId);

  return this.prisma.agence.update({
    where: { id },
    data: { isActive: !agence.isActive },
  });
}

async changeAgent(
  agenceId: number,
  newEmail: string,
  partenaireId: number,
): Promise<{ message: string }> {

  // ✅ 1. Vérifier que l'agence appartient au partenaire
  const agence = await this.prisma.agence.findFirst({
    where: { id: agenceId, partenaireId },
  });
  if (!agence) throw new NotFoundException('Agence introuvable');

  // ✅ 2. Vérifier unicité du nouvel email
  const existingAgent = await this.prisma.agent.findUnique({
    where: { email: newEmail },
  });
  if (existingAgent) {
    throw new ConflictException(`Un agent avec l'email "${newEmail}" existe déjà`);
  }

  const existingUser = await this.prisma.user.findUnique({
    where: { email: newEmail },
  });
  if (existingUser) {
    throw new ConflictException(`Un compte avec l'email "${newEmail}" existe déjà`);
  }

  // ✅ 3. Transaction
  await this.prisma.$transaction(async (tx) => {

    // Trouver l'ancien agent lié à cette agence
    const oldAgent = await tx.agent.findFirst({
      where: { agence: { id: agenceId } },
    });

    if (oldAgent) {
      // Désactiver + détacher l'ancien agent
      await tx.agent.update({
        where: { id: oldAgent.id },
        data: {
          isActive: false,
          agence: { disconnect: true }, // ✅ détacher la relation
        },
      });

      // Supprimer l'ancien User lié
      if (oldAgent.userId) {
        await tx.user.delete({
          where: { id: oldAgent.userId },
        });
      }
    }

    // Récupérer le rôle agent
    const roleAgent = await tx.role.findUnique({
      where: { name: 'agent' },
    });
    if (!roleAgent) throw new NotFoundException('Rôle agent introuvable en base');

    // Créer le nouveau User
    const newUser = await tx.user.create({
      data: {
        email: newEmail,
        name: agence.nom,
        password: null,
        role: { connect: { id: roleAgent.id } },
      },
    });

    // Créer le nouvel Agent (token placeholder — mis à jour par resendInvitation)
    await tx.agent.create({
      data: {
        email: newEmail,
        profileToken: '',
        profileTokenExpiresAt: new Date(),
        isProfileCompleted: false,
        isActive: true,
        agence: { connect: { id: agenceId } },  // ✅ connecter via relation
        user:   { connect: { id: newUser.id } }, // ✅ connecter via relation
      },
    });

    // Mettre l'agence en Inactive
    await tx.agence.update({
      where: { id: agenceId },
      data: { isActive: false },
    });
  });

  // ✅ 4. Réutiliser resendInvitation — génère le vrai token + envoie l'email
  return this.resendInvitation(agenceId, partenaireId);
}

async resendInvitation(
  agenceId: number,
  partenaireId: number,
): Promise<{ message: string }> {

  const agence = await this.prisma.agence.findFirst({
    where: { id: agenceId, partenaireId },
    include: { partenaire: true },
  });
  if (!agence) throw new NotFoundException('Agence introuvable');

  const agent = await this.prisma.agent.findFirst({
    where: { agence: { id: agenceId } },
  });
  if (!agent) throw new NotFoundException('Aucun agent lié à cette agence');

  if (agent.isProfileCompleted) {
    throw new ConflictException('Le profil est déjà complété — aucun email à renvoyer');
  }

  // ✅ Générer un nouveau token
  const profileToken          = randomBytes(32).toString('hex');
  const profileTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await this.prisma.agent.update({
    where: { id: agent.id },
    data: { profileToken, profileTokenExpiresAt },
  });

  await this.emailService.sendAgenceCreatedCompleteProfile({
    email: agent.email,
    nomAgence: agence.nom,
    ville: agence.ville ?? undefined,
    profileToken,
    codePartenaire: agence.partenaire?.codePartenaire ?? '',
  });

  return { message: 'Email renvoyé avec succès' };
}


// agence.service.ts
async findAgencesWithAgentsByPartenaire(partenaireId: number) {
  return this.prisma.agence.findMany({
    where: { partenaireId },
    include: {
      agents: true,
    },
  });
}


}
