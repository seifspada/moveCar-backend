import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { StatutDemande } from '@prisma/client';

import { CreateDemandeAdherentDto } from './Dto/create-demande-adherent.dto';
import { DemandeAdherentService } from './demande-adherent.service';
import { DemandeAdherentFiles, FastifyFileKV } from './Types/types';
import { UpdateDemandeAdherentDto } from './Dto/update-demande-adherent.dto';
import { UpdateDocumentDatesDto } from './Dto/update-document-dates.dto';

@ApiTags('demandes-adherents')
@Controller('demandes-adherents')
export class DemandeAdherentController {
  constructor(private readonly demandeService: DemandeAdherentService) {}

  // ══════════════════════════════════════════
  // POST
  // ══════════════════════════════════════════

  @Post()
  @ApiOperation({ summary: "Créer une nouvelle demande d'adhésion" })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201 })
  async create(@Req() req: FastifyRequest, @Body() dto: CreateDemandeAdherentDto) {
    const body: any = req.body;

    const toArray = (v: FastifyFileKV | FastifyFileKV[] | undefined) =>
      Array.isArray(v) ? v : v ? [v] : [];

    const files: DemandeAdherentFiles = {
      carteIdentite:          toArray(body.carteIdentite),
      permisRectoVerso:       toArray(body.permisRectoVerso),
      kbis:                   toArray(body.kbis),
      rib:                    toArray(body.rib),
      assuranceRcPro:         toArray(body.assuranceRcPro),
      assuranceRcCirculation: toArray(body.assuranceRcCirculation),
      casierJudiciaire:       toArray(body.casierJudiciaire),
      carteGrisWgarage:       toArray(body.carteGrisWgarage),
    };

    if ((files.carteIdentite?.length ?? 0) !== 2) {
      throw new BadRequestException('carteIdentite doit contenir exactement 2 fichiers');
    }
    if ((files.permisRectoVerso?.length ?? 0) !== 2) {
      throw new BadRequestException('permisRectoVerso doit contenir exactement 2 fichiers');
    }

    const singles: (keyof DemandeAdherentFiles)[] = [
      'kbis', 'rib', 'assuranceRcPro',
      'assuranceRcCirculation', 'casierJudiciaire', 'carteGrisWgarage',
    ];
    for (const k of singles) {
      if ((files[k]?.length ?? 0) > 1) {
        throw new BadRequestException(`${String(k)} doit contenir 1 seul fichier`);
      }
    }

    return this.demandeService.create(dto, files);
  }

  // ══════════════════════════════════════════
  // GET — statiques AVANT :id ⚠️
  // ══════════════════════════════════════════

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les demandes (?statut= optionnel)' })
  findAll(@Query('statut') statut?: StatutDemande) {
    return statut
      ? this.demandeService.findByStatut(statut)
      : this.demandeService.findAll();
  }

  @Get('verify-token/:token')
  @ApiOperation({ summary: 'Vérifier le token de création profil' })
  async verifyToken(@Param('token') token: string) {
    return this.demandeService.verifyProfileToken(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une demande par ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.demandeService.findOne(id);
  }

  // ══════════════════════════════════════════
  // PATCH — spécifiques AVANT :id ⚠️
  // ══════════════════════════════════════════

 @Patch(':id/accepter')
@ApiOperation({ summary: 'Accepter une demande adhérent' })
@ApiResponse({ status: 200, description: 'Demande acceptée avec succès' })
@ApiResponse({ status: 404, description: 'Demande non trouvée' })
@ApiResponse({ status: 409, description: 'Demande déjà acceptée' })
accepter(@Param('id', ParseIntPipe) id: number) {
  return this.demandeService.accepter(id);
}

@Patch(':id/refuser')
@ApiOperation({ summary: 'Refuser une demande' })
refuser(
  @Param('id', ParseIntPipe) id: number,
  @Body() body?: { motif?: string },
) {
  return this.demandeService.refuser(id, body?.motif);
}

@Patch(':id/documents/:documentId/dates')
@ApiOperation({ summary: "Mettre à jour les dates de validité d'un document" }) // ✅ guillemets doubles
updateDocumentDates(
  @Param('id',         ParseIntPipe) id:         number,
  @Param('documentId', ParseIntPipe) documentId: number,
  @Body() dto: UpdateDocumentDatesDto,
) {
  return this.demandeService.updateDocumentDates(id, documentId, dto);
}

@Patch(':id')
@ApiOperation({ summary: 'Mettre à jour une demande (statut, etc.)' })
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateDto: UpdateDemandeAdherentDto,
) {
  return this.demandeService.update(id, updateDto);
}

@Delete(':id')
@ApiOperation({ summary: 'Supprimer une demande' })
remove(@Param('id', ParseIntPipe) id: number) {
  return this.demandeService.remove(id);
}

}