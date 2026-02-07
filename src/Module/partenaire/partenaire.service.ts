// src/partenaires/partenaires.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreatePartenaireProfileDto } from './dto/create-partenaire-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdatePartenaireDto } from './dto/update-partenaire.dto';
import * as bcrypt from 'bcrypt';
import { DemandePartenaire, StatutDemande } from '@prisma/client';

@Injectable()
export class PartenaireService {
  constructor(private readonly prisma: PrismaService) {}
/*
async createProfilFromDemande(
  profileToken: string,
  codePartenaire: string,
  dto: CreatePartenaireProfileDto,
) {
  // 0) Vérifier la demande partenaire
  const demande = await this.prisma.demandePartenaire.findFirst({
    where: {
      profileToken,
      codePartenaire,
      statutDemande: 'ACCEPTEE',
      profileTokenExpiry: { gt: new Date() },
      partenaireId: null,
    },
  });

  if (!demande) {
    throw new NotFoundException(
      'Demande introuvable, expirée ou déjà utilisée',
    );
  }

  // 1) Vérifier email côté demande adhésion
  const existingAdhesionDemand = await this.prisma.demandeAdhesion.findFirst({
    where: { email: dto.email },
  });

  if (existingAdhesionDemand) {
    throw new BadRequestException(
      "Cet email est déjà utilisé pour une demande d'adhésion. Un email ne peut être associé qu'à un seul type de rôle.",
    );
  }

  // 2) Vérifier email côté adhérent
  const existingAdherent = await this.prisma.adherent.findFirst({
    where: { user: { email: dto.email } },
    include: { user: true },
  });

  if (existingAdherent) {
    throw new BadRequestException(
      "Cet email est déjà associé à un compte adhérent. Un email ne peut être associé qu'à un seul type de rôle.",
    );
  }

  // 3) Vérifier email côté partenaire
  const existingPartner = await this.prisma.partenaire.findFirst({
    where: { email: dto.email },
  });

  if (existingPartner) {
    throw new BadRequestException(
      "Cet email est déjà utilisé par un autre compte partenaire.",
    );
  }

  // 4) Vérifier email côté User
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (existingUser) {
    throw new ConflictException(
      'Un compte utilisateur existe déjà avec cet email. Veuillez vous connecter.',
    );
  }

  // 5) Récupérer le rôle PARTENAIRE
  const partenaireRole = await this.prisma.role.findFirst({
    where: { name: 'PARTENAIRE' },
  });

  if (!partenaireRole) {
    throw new BadRequestException(
      'Rôle PARTENAIRE non trouvé. Contactez un administrateur.',
    );
  }

  // 6) Vérifier et hasher le mot de passe
  if (!dto.motDePasse || dto.motDePasse.length < 8) {
    throw new BadRequestException(
      'Le mot de passe doit contenir au moins 8 caractères',
    );
  }

  const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

  // 7) Transaction : User + Partenaire + MAJ Demande
  const partenaire = await this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: dto.nom,
        email: dto.email,
        password: hashedPassword,
        roleId: partenaireRole.id,
      },
    });

    const partenaire = await tx.partenaire.create({
      data: {
        nom: dto.nom,
        entite: dto.entite,
        email: dto.email,
        telephone: dto.telephone,
        codePartenaire,
        userId: user.id,
        demandeInitiale: {
          connect: { id: demande.id },
        },
      },
    });

    await tx.demandePartenaire.update({
      where: { id: demande.id },
      data: { partenaireId: partenaire.id },
    });

    return partenaire;
  });

  return partenaire;
}
*/

async createProfilPartenaireFromToken(
  profileToken: string,
  codePartenaire: string,
  dto: CreatePartenaireProfileDto,
) {
  console.log('🔍 Recherche demande partenaire avec:', {
    profileToken,
    codePartenaire,
  });

  // 1) Chercher la demande
  const demande = await this.prisma.demandePartenaire.findFirst({
    where: {
      profileToken,
      codePartenaire,
      statutDemande: StatutDemande.ACCEPTEE,
      profileTokenExpiry: { gt: new Date() },
    },
    include: { partenaire: true },
  });

  console.log('📋 Demande trouvée:', demande ? {
    id: demande.id,
    email: demande.email,
    statutDemande: demande.statutDemande,
    profileTokenExpiry: demande.profileTokenExpiry,
    partenaireExiste: !!demande.partenaire,
  } : 'AUCUNE');

  if (!demande) {
    console.error('❌ Demande introuvable, expirée ou déjà utilisée');
    throw new NotFoundException('Demande introuvable, expirée ou déjà utilisée');
  }

  // 2) Vérifier expiration (double vérification)
  if (demande.profileTokenExpiry && demande.profileTokenExpiry < new Date()) {
    console.error('❌ Token expiré:', {
      expiry: demande.profileTokenExpiry,
      now: new Date(),
    });
    throw new BadRequestException('Token expiré');
  }

  // 3) Vérifier statut
  if (demande.statutDemande !== StatutDemande.ACCEPTEE) {
    console.error('❌ Statut invalide:', demande.statutDemande);
    throw new BadRequestException(`Demande non acceptée (statut: ${demande.statutDemande})`);
  }

  // 4) Vérifier partenaire existant
  if (demande.partenaire) {
    console.error('❌ Partenaire déjà créé');
    throw new ConflictException('Un profil a déjà été créé pour cette demande');
  }

  console.log('✅ Validations OK, création du profil partenaire...');

  // 5) Appeler la méthode core
  return this.createProfilPartenaireCore(
    demande,
    dto,
  );
}

private async createProfilPartenaireCore(
  demande: DemandePartenaire,
  dto: CreatePartenaireProfileDto,
) {
  // 1) Vérifier email côté demande adhésion
  const existingAdhesionDemand = await this.prisma.demandeAdhesion.findFirst({
    where: { email: dto.email },
  });

  if (existingAdhesionDemand) {
    throw new BadRequestException(
      "Cet email est déjà utilisé pour une demande d'adhésion.",
    );
  }

  // 2) Vérifier email côté adhérent
  const existingAdherent = await this.prisma.adherent.findFirst({
    where: { user: { email: dto.email } },
    include: { user: true },
  });

  if (existingAdherent) {
    throw new BadRequestException(
      "Cet email est déjà associé à un compte adhérent.",
    );
  }

  // 3) Vérifier email côté partenaire
  const existingPartner = await this.prisma.partenaire.findFirst({
    where: { email: dto.email },
  });

  if (existingPartner) {
    throw new BadRequestException(
      "Cet email est déjà utilisé par un autre partenaire.",
    );
  }

  // 4) Vérifier email côté User
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (existingUser) {
    throw new ConflictException(
      'Un compte existe déjà avec cet email.',
    );
  }

  // 5) Récupérer le rôle partenaire
  const partenaireRole = await this.prisma.role.findFirst({
    where: { name: 'partenaire' },
  });

  if (!partenaireRole) {
    throw new BadRequestException(
      'Rôle partenaire non trouvé. Contactez un administrateur.',
    );
  }

  // 6) Hasher le mot de passe
  console.log('🔐 Hash du mot de passe...');
  const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);

  // 7) Transaction User + Partenaire
  console.log('💾 Création User + Partenaire...');
  const partenaire = await this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: dto.nom,
        email: dto.email,
        password: hashedPassword,
        roleId: partenaireRole.id,
      },
    });

    const partenaire = await tx.partenaire.create({
      data: {
        nom: dto.nom,
        entite: dto.entite,
        email: dto.email,
        telephone: dto.telephone,
        codePartenaire: demande.codePartenaire,
        userId: user.id,
        demandeInitiale: {
          connect: { id: demande.id },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Mettre à jour la demande
    await tx.demandePartenaire.update({
      where: { id: demande.id },
      data: {
        partenaireId: partenaire.id,
        profileToken: null, // ✅ Invalider le token
        profileTokenExpiry: null,
      },
    });

    return partenaire;
  });

  console.log('✅ Partenaire créé:', partenaire.id);

  return {
    success: true,
    message: 'Profil partenaire créé avec succès',
    partenaire: {
      id: partenaire.id,
      nom: partenaire.nom,
      email: partenaire.email,
      entite: partenaire.entite,
      user: partenaire.user,
    },
  };
}



  async findOne(id: number) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
      include: {
        demandeInitiale: true,
        user: true,
      },
    });

    if (!partenaire) {
      throw new NotFoundException('Partenaire introuvable');
    }

    return partenaire;
  }

  async update(id: number, dto: UpdatePartenaireDto) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
    });

    if (!partenaire) {
      throw new NotFoundException('Partenaire introuvable');
    }

    return this.prisma.partenaire.update({
      where: { id },
      data: {
        nom: dto.nom ?? partenaire.nom,
        entite: dto.entite ?? partenaire.entite,
        email: dto.email ?? partenaire.email,
        telephone: dto.telephone ?? partenaire.telephone,
        // adresseAgence / ville si tu ajoutes les colonnes plus tard
      },
    });
  }
async findAll() {
  return this.prisma.partenaire.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      demandeInitiale: true, // ou false si tu ne veux pas les détails de la demande
      user: true,            // idem pour le user lié
    },
  });
}
  async remove(id: number) {
    const partenaire = await this.prisma.partenaire.findUnique({
      where: { id },
    });

    if (!partenaire) {
      throw new NotFoundException('Partenaire introuvable');
    }

    // Détacher la demande initiale si besoin
    await this.prisma.demandePartenaire.updateMany({
      where: { partenaireId: id },
      data: { partenaireId: null },
    });

    return this.prisma.partenaire.delete({
      where: { id },
    });
  }

}
