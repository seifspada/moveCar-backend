// src/partenaires/partenaires.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Post,
  Query,
  ParseIntPipe,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PartenaireService } from './partenaire.service';
import { CreatePartenaireProfileDto } from './dto/create-partenaire-profile.dto';
import { UpdatePartenaireDto } from './dto/update-partenaire.dto';
import { FastifyRequest } from 'fastify';


@Controller('partenaire')
export class PartenaireController {
  constructor(private readonly partenairesService: PartenaireService) {}

@Post('creer-profil/:profileToken')
@ApiOperation({ summary: 'Créer un profil partenaire à partir d’une demande validée' })
@ApiConsumes('multipart/form-data') // ✅ Important
@ApiResponse({ status: 201, description: 'Partenaire créé avec succès' })
@ApiResponse({ status: 400, description: 'Données incorrectes ou demande non valide' })
@ApiResponse({ status: 404, description: 'Demande introuvable ou expirée' })
async createProfilPartenaire(
  @Param('profileToken') profileToken: string,
  @Query('code') codePartenaire: string,
  @Req() req: FastifyRequest,
) {
  const body: any = req.body;

  console.log('📦 Body reçu:', {
    nom: body.nom,
    entite: body.entite,
    telephone: body.telephone,
    email: body.email,
    motDePasse: body.motDePasse ? '***' : 'MANQUANT',
    adresseAgence: body.adresseAgence,
    ville: body.ville,
  });

  // ✅ Validation manuelle des champs obligatoires
  if (!body.nom || typeof body.nom !== 'string' || body.nom.trim().length < 2) {
    throw new BadRequestException('Le nom est obligatoire (min 2 caractères)');
  }

  if (!body.entite || typeof body.entite !== 'string' || body.entite.trim().length < 2) {
    throw new BadRequestException("L'entité est obligatoire (min 2 caractères)");
  }

  if (!body.telephone || typeof body.telephone !== 'string') {
    throw new BadRequestException('Le téléphone est obligatoire');
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    throw new BadRequestException("L'email est obligatoire et doit être valide");
  }

  if (!body.motDePasse || typeof body.motDePasse !== 'string' || body.motDePasse.length < 8) {
    throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
  }

  // ✅ Construire le DTO
  const dto: CreatePartenaireProfileDto = {
    nom: body.nom.trim(),
    entite: body.entite.trim(),
    telephone: body.telephone.trim(),
    email: body.email.toLowerCase().trim(),
    motDePasse: body.motDePasse,
    adresseAgence: body.adresseAgence?.trim() || undefined,
    ville: body.ville?.trim() || undefined,
  };

  console.log('✅ DTO construit:', { ...dto, motDePasse: '***' });

  return this.partenairesService.createProfilPartenaireFromToken(
    profileToken,
    codePartenaire,
    dto,
  );
}

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un partenaire par ID' })
  @ApiResponse({ status: 200, description: 'Partenaire trouvé' })
  @ApiResponse({ status: 404, description: 'Partenaire introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partenairesService.findOne(id);
  }

  // ✅ Mise à jour d’un partenaire
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un partenaire' })
  @ApiResponse({ status: 200, description: 'Partenaire mis à jour' })
  @ApiResponse({ status: 404, description: 'Partenaire introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartenaireDto,
  ) {
    return this.partenairesService.update(id, dto);
  }
  
@Get()
@ApiOperation({ summary: 'Récupérer tous les partenaires' })
@ApiResponse({ status: 200, description: 'Liste des partenaires' })
findAll() {
  return this.partenairesService.findAll();
}

  // ✅ Suppression d’un partenaire
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un partenaire' })
  @ApiResponse({ status: 200, description: 'Partenaire supprimé' })
  @ApiResponse({ status: 404, description: 'Partenaire introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partenairesService.remove(id);
  }

}