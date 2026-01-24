import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatutDemande, TypeDocument } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { CreateDemandeDto } from './dto/create-demande.dto';
import { DemandeFiles, FastifyFileKV } from './Types/types';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';

@Injectable()
export class DemandeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly geoService: GeoService,
  ) {}

  private static readonly ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  private assertAllowedFile(field: string, file: { mimetype?: string }) {
    if (!file?.mimetype) {
      throw new BadRequestException(`${field}: fichier invalide (mimetype manquant)`);
    }
    if (!DemandeService.ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `${field}: type non autorisé (${file.mimetype}). Autorisés: PDF/JPG/PNG/WEBP`,
      );
    }
  }

  private validateAllFiles(files: DemandeFiles) {
    if ((files.carteIdentite?.length ?? 0) !== 2) {
      throw new BadRequestException('carteIdentite doit contenir exactement 2 fichiers');
    }
    if ((files.permisRectoVerso?.length ?? 0) !== 2) {
      throw new BadRequestException('permisRectoVerso doit contenir exactement 2 fichiers');
    }

    const singles: (keyof DemandeFiles)[] = [
      'kbis',
      'rib',
      'assuranceRcPro',
      'assuranceRcCirculation',
      'casierJudiciaire',
      'carteGrisWgarage',
    ];

    for (const k of singles) {
      if ((files[k]?.length ?? 0) > 1) {
        throw new BadRequestException(`${String(k)} doit contenir 1 seul fichier`);
      }
    }

    const allEntries = Object.entries(files) as Array<[string, FastifyFileKV[] | undefined]>;
    for (const [key, arr] of allEntries) {
      for (const f of arr ?? []) {
        this.assertAllowedFile(key, f);
      }
    }
  }

  private async saveFile(uploadDir: string, key: string, f: FastifyFileKV) {
    this.assertAllowedFile(key, f);

    const fileName = `${key}_${uuidv4()}${path.extname(f.filename)}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, f.value);
    return { fileName };
  }

  async create(dto: CreateDemandeDto, files: DemandeFiles) {
    // 1) email existe ?
    const existingDemande = await this.prisma.demandeAdhesion.findFirst({
      where: { email: dto.email },
    });

    if (existingDemande) {
      throw new BadRequestException('Une demande avec cet email existe déjà');
    }

    // 2) ✅ valider fichiers AVANT insertion DB
    this.validateAllFiles(files);

    // 3) ✅ valider ville France AVANT insertion DB
    await this.geoService.assertVilleFrance(dto.ville);

    // 4) create DB (seulement si tout est OK)
    const demande = await this.prisma.demandeAdhesion.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        dateNaissance: new Date(dto.dateNaissance),
        email: dto.email,
        telephone: dto.telephone,
        adresse: dto.adresse,
        ville: dto.ville, 
        raisonSociale: dto.raisonSociale,
        numeroKbis: dto.numeroKbis,
        statut: StatutDemande.EN_ATTENTE,
      },
    });

    // 5) save files + documents
    const uploadDir = path.join(process.cwd(), 'uploads', 'demandes', String(demande.id));
    await fs.mkdir(uploadDir, { recursive: true });

    for (const f of files.carteIdentite ?? []) {
      await this.saveFile(uploadDir, 'carteIdentite', f);
    }

    for (const f of files.permisRectoVerso ?? []) {
      const { fileName } = await this.saveFile(uploadDir, 'permisRectoVerso', f);

      await this.prisma.document.create({
        data: {
          typeDocument: TypeDocument.PERMIS,
          cheminFichier: `/uploads/demandes/${demande.id}/${fileName}`,
          demandeAdhesionId: demande.id,
          numero: dto.numeroPermis,
          dateDelivrance: new Date(dto.dateDelivrance),
        },
      });
    }

    const singles: Array<[keyof DemandeFiles, TypeDocument | null]> = [
      ['kbis', null],
      ['rib', null],
      ['assuranceRcPro', TypeDocument.RC_PRO],
      ['assuranceRcCirculation', TypeDocument.RC_CIRCULATION],
      ['casierJudiciaire', null],
      ['carteGrisWgarage', TypeDocument.W_GARAGE],
    ];

    for (const [key, docType] of singles) {
      const arr = files[key] ?? [];
      if (!arr.length) continue;

      const { fileName } = await this.saveFile(uploadDir, String(key), arr[0]);

      if (docType) {
        await this.prisma.document.create({
          data: {
            typeDocument: docType,
            cheminFichier: `/uploads/demandes/${demande.id}/${fileName}`,
            demandeAdhesionId: demande.id,
          },
        });
      }
    }

    // 6) ✅ send emails (après succès complet)
    await this.emailService.sendDemandeRecueAdherent(dto.email, dto.nom);
    await this.emailService.sendNouvelleDemandeAdmin(dto.email);

    return this.prisma.demandeAdhesion.findUnique({
      where: { id: demande.id },
      include: { documents: true },
    });
  }

  async findAll() {
    return this.prisma.demandeAdhesion.findMany({
      include: { documents: true },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: number) {
    const demande = await this.prisma.demandeAdhesion.findUnique({
      where: { id },
      include: { documents: true, adherent: true },
    });

    if (!demande) throw new NotFoundException(`Demande #${id} non trouvée`);
    return demande;
  }

  async findByStatut(statut: StatutDemande) {
    return this.prisma.demandeAdhesion.findMany({
      where: { statut },
      include: { documents: true },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async valider(id: number) {
    const demande = await this.findOne(id);

    if (demande.statut !== StatutDemande.EN_ATTENTE) {
      throw new BadRequestException('Seules les demandes en attente peuvent être validées');
    }

    return this.prisma.demandeAdhesion.update({
      where: { id },
      data: { statut: StatutDemande.VALIDEE },
      include: { documents: true },
    });
  }

  async refuser(id: number) {
    const demande = await this.findOne(id);

    if (demande.statut !== StatutDemande.EN_ATTENTE) {
      throw new BadRequestException('Seules les demandes en attente peuvent être refusées');
    }

    return this.prisma.demandeAdhesion.update({
      where: { id },
      data: { statut: StatutDemande.REFUSEE },
      include: { documents: true },
    });
  }
}
