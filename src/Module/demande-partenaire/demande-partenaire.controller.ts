// src/Module/demande-partenaire/demande-partenaire.controller.ts

import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Patch,
  Body, 
  Param, 
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
  BadRequestException,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { DemandePartenaireService } from './demande-partenaire.service';
import { CreateDemandePartenaireDto } from './dto/create-demande-partenaire.dto';
import { StatutDemande } from '@prisma/client';
import { BloquerDateDto } from './dto/bloquer-date.dto';
import { DebloquerDateDto } from './dto/debloquer-date.dto';
import { AccepterDemandeDto } from './dto/accepter-demande.dto';
import { FastifyRequest } from 'fastify';
import { FastifyFileKV } from '../demande-adherent/Types/types';
import { ReporterDemandeDto } from './dto/reporter-demande.dto';

@ApiTags('Demandes Partenaire')
@Controller('demandes-partenaire')
export class DemandePartenaireController {
  constructor(
    private readonly demandePartenaireService: DemandePartenaireService
  ) {}

  // ==========================================
  // 📝 CRÉATION DE DEMANDE (PUBLIC)
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle demande de partenariat' })
  @ApiResponse({ status: 201, description: 'Demande créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou date dans le passé' })
  @ApiResponse({ status: 409, description: 'Demande déjà existante ou créneau réservé' })
  create(@Body() createDto: CreateDemandePartenaireDto) {
    return this.demandePartenaireService.create(createDto);
  }

  // ==========================================
  // 🗓️ GESTION DES CRÉNEAUX (PUBLIC)
  // ⚠️ IMPORTANT: Ces routes DOIVENT être AVANT @Get(':id')
  // ==========================================

  @Get('creneaux/disponibles')
  @ApiOperation({ summary: 'Récupérer les créneaux disponibles pour une date' })
  @ApiQuery({ name: 'date', example: '2026-02-15', description: 'Date au format YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Créneaux récupérés avec succès' })
  @ApiResponse({ status: 400, description: 'Format de date invalide' })
  getCreneauxDisponibles(@Query('date') date: string) {
    return this.demandePartenaireService.getCreneauxDisponibles(date);
  }

  @Get('dates/indisponibles')
  @ApiOperation({ summary: 'Récupérer les dates indisponibles du mois' })
  @ApiQuery({ name: 'annee', example: 2026, description: 'Année' })
  @ApiQuery({ name: 'mois', example: 2, description: 'Mois (1-12)' })
  @ApiResponse({ status: 200, description: 'Dates indisponibles récupérées' })
  getDatesIndisponibles(
    @Query('annee', ParseIntPipe) annee: number,
    @Query('mois', ParseIntPipe) mois: number
  ) {
    return this.demandePartenaireService.getDatesIndisponibles(annee, mois);
  }

  // ==========================================
  // 📊 STATISTIQUES (ADMIN)
  // ==========================================

  @Get('statistiques')
  @ApiOperation({ summary: 'Récupérer les statistiques des demandes partenaires' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  getStatistiques() {
    return this.demandePartenaireService.getStatistiques();
  }

  // ==========================================
  // 📋 RÉCUPÉRATION DES DEMANDES (ADMIN)
  // ==========================================

  @Get('statut/:statut')
  @ApiOperation({ summary: 'Récupérer les demandes par statut' })
  @ApiResponse({ status: 200, description: 'Demandes récupérées' })
  findByStatut(@Param('statut') statut: StatutDemande) {
    return this.demandePartenaireService.findByStatut(statut);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les demandes de partenariat' })
  @ApiResponse({ status: 200, description: 'Liste des demandes récupérée' })
  findAll() {
    return this.demandePartenaireService.findAll();
  }

  // ==========================================
  // 🔍 RÉCUPÉRATION PAR ID (ADMIN)
  // ⚠️ Cette route DOIT être APRÈS les routes spécifiques
  // ==========================================

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une demande de partenariat par ID' })
  @ApiResponse({ status: 200, description: 'Demande trouvée' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.demandePartenaireService.findOne(id);
  }

  // ==========================================
  // ✅ VALIDATION DE DEMANDE (ADMIN)
  // ==========================================

    @Patch(':id/confirmer-rdv')
  @ApiOperation({ summary: 'Accepter une demande de partenariat' })
  @ApiResponse({ status: 200, description: 'Demande acceptée avec succès' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @ApiResponse({ status: 409, description: 'Demande déjà traitée' })
  confirmerRendezvous(
    @Param('id', ParseIntPipe) id: number,
    @Body('profileUrl') profileUrl: string
  ) {
    return this.demandePartenaireService.confirmerRendezvous(id, profileUrl);
  }



  @Patch(':id/refuser')
  @ApiOperation({ summary: 'Refuser une demande de partenariat' })
  @ApiResponse({ status: 200, description: 'Demande refusée' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  refuserDemande(
    @Param('id', ParseIntPipe) id: number,
    @Body('motif') motif?: string
  ) {
    return this.demandePartenaireService.refuserDemande(id, motif);
  }

  // ==========================================
  // 📅 CONFIRMATION DE RENDEZ-VOUS (ADMIN)
  // ==========================================

  @Patch(':id/accepter')
  @ApiOperation({ summary: 'Accepter une demande partenaire avec upload du contrat' })
  @ApiConsumes('multipart/form-data') // ✅ Permet l'upload de fichiers
  @ApiResponse({ status: 200, description: 'Demande acceptée avec succès' })
  @ApiResponse({ status: 404, description: 'Demande non trouvée' })
  @ApiResponse({ status: 409, description: 'Demande déjà acceptée' })
  @ApiResponse({ status: 400, description: 'Fichier contrat manquant ou invalide' })
  async accepterDemande(
    @Req() req: FastifyRequest, // ✅ Accès à la requête Fastify brute
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AccepterDemandeDto,
  ) {
    const body: any = req.body;

    // ✅ Extraire le fichier contrat (peut être un objet unique ou un tableau)
    const toArray = (v: FastifyFileKV | FastifyFileKV[] | undefined): FastifyFileKV[] =>
      Array.isArray(v) ? v : v ? [v] : [];

    const contratFiles = toArray(body.contrat);

    // ✅ Validation : exactement 1 fichier contrat
    if (contratFiles.length === 0) {
      throw new BadRequestException('Le fichier contrat est obligatoire');
    }
    if (contratFiles.length > 1) {
      throw new BadRequestException('Un seul fichier contrat est autorisé');
    }

    // ✅ Appeler le service avec le fichier
    return this.demandePartenaireService.accepterDemande(id, dto, contratFiles);
  }



  // ==========================================
  // 🚫 GESTION DES DATES BLOQUÉES (ADMIN)
  // ==========================================

 @Post('dates/bloquer')
@ApiOperation({ summary: 'Bloquer une date (jour férié, congé, etc.)' })
@ApiResponse({ status: 201, description: 'Date bloquée avec succès' })
@ApiResponse({ status: 409, description: 'Date déjà bloquée' })
bloquerDate(@Body() dto: BloquerDateDto) {
  return this.demandePartenaireService.bloquerDate(dto.date, dto.motif);
}

@Patch('dates/debloquer')
@ApiOperation({ summary: 'Débloquer une date' })
@ApiResponse({ status: 200, description: 'Date débloquée avec succès' })
@ApiResponse({ status: 404, description: 'Date non bloquée' })
debloquerDate(@Body() dto: DebloquerDateDto) {
  return this.demandePartenaireService.debloquerDate(dto.date);
}

 @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une demande de partenariat' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la demande' })
  @ApiResponse({ status: 200, description: 'Demande supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Demande introuvable' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer cette demande' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.demandePartenaireService.remove(id);
  }

  @Patch(':id/reporter')
@ApiOperation({ summary: 'Reporter un rendez-vous partenaire' })
@ApiResponse({ status: 200, description: 'Rendez-vous reporté avec succès' })
@ApiResponse({ status: 404, description: 'Demande introuvable' })
@ApiResponse({ status: 409, description: 'Nouveau créneau déjà réservé' })
@ApiResponse({ status: 400, description: 'Date invalide ou dans le passé' })
async reporter(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: ReporterDemandeDto,
) {
  return this.demandePartenaireService.reporter(id, dto.nouvelleDateRdv, dto.nouveauCreneau);
}

  @Get('rendezvous')                                              // ← avant :id !
  @ApiOperation({ summary: 'Récupérer tous les rendez-vous avec leur email' })
  @ApiResponse({ status: 200, description: 'Liste des rendez-vous retournée' })
  findAllRendezvous() {
    return this.demandePartenaireService.findAllRendezvous();
  }
}