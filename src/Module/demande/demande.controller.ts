import {
  BadRequestException,
  Body,
  Controller,
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

import { CreateDemandeDto } from './dto/create-demande.dto';
import { DemandeService } from './demande.service';
import { DemandeFiles, FastifyFileKV } from './Types/types';

@ApiTags('demandes')
@Controller('demandes')
export class DemandeController {
  constructor(private readonly demandeService: DemandeService) {}

  @Post()
  @ApiOperation({ summary: "Créer une nouvelle demande d'adhésion" })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201 })
  async create(@Req() req: FastifyRequest, @Body() dto: CreateDemandeDto) {
    const body: any = req.body;

    const toArray = (v: FastifyFileKV | FastifyFileKV[] | undefined) =>
      Array.isArray(v) ? v : v ? [v] : [];

    const files: DemandeFiles = {
      carteIdentite: toArray(body.carteIdentite),
      permisRectoVerso: toArray(body.permisRectoVerso),
      kbis: toArray(body.kbis),
      rib: toArray(body.rib),
      assuranceRcPro: toArray(body.assuranceRcPro),
      assuranceRcCirculation: toArray(body.assuranceRcCirculation),
      casierJudiciaire: toArray(body.casierJudiciaire),
      carteGrisWgarage: toArray(body.carteGrisWgarage),
    };

    // ✅ règles: 2 fichiers
    if ((files.carteIdentite?.length ?? 0) !== 2) {
      throw new BadRequestException('carteIdentite doit contenir exactement 2 fichiers');
    }
    if ((files.permisRectoVerso?.length ?? 0) !== 2) {
      throw new BadRequestException('permisRectoVerso doit contenir exactement 2 fichiers');
    }

    // ✅ règles: 1 fichier max
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

    return this.demandeService.create(dto, files);
  }

  @Get()
  findAll(@Query('statut') statut?: StatutDemande) {
    if (statut) return this.demandeService.findByStatut(statut);
    return this.demandeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.demandeService.findOne(id);
  }

  @Patch(':id/valider')
  valider(@Param('id', ParseIntPipe) id: number) {
    return this.demandeService.valider(id);
  }

  @Patch(':id/refuser')
  refuser(@Param('id', ParseIntPipe) id: number) {
    return this.demandeService.refuser(id);
  }
}
