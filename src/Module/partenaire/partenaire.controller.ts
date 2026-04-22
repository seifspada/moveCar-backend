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
  UseGuards,
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
  @ApiOperation({ summary: "Créer un profil partenaire à partir d'une demande validée" })
  @ApiConsumes('multipart/form-data')
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
      prenom: body.prenom,
      entiteGroupe: body.entiteGroupe,
      entiteAgence: body.entiteAgence,
      telephone: body.telephone,
      email: body.email,
      motDePasse: body.motDePasse ? '***' : 'MANQUANT',
      adresseAgence: body.adresseAgence,
      ville: body.ville,
      photo: body.photo ? '📸 Fichier présent' : '⚠️ Aucune photo',
    });

    const getField = (field: any): string | undefined =>
      field && typeof field === 'object' && 'value' in field
        ? field.value
        : field;

    const nom = getField(body.nom);
    const prenom = getField(body.prenom);
    const entiteGroupe = getField(body.entiteGroupe);
    const entiteAgence = getField(body.entiteAgence);
    const telephone = getField(body.telephone);
    const email = getField(body.email);
    const motDePasse = getField(body.motDePasse);
    const adresseAgence = getField(body.adresseAgence);
    const ville = getField(body.ville);

    if (!nom || nom.trim().length < 2) {
      throw new BadRequestException('Le nom est obligatoire (min 2 caractères)');
    }

    if (!prenom || prenom.trim().length < 2) {
      throw new BadRequestException('Le prénom est obligatoire (min 2 caractères)');
    }

    if (!entiteGroupe || entiteGroupe.trim().length < 2) {
      throw new BadRequestException("L'entité groupe est obligatoire (min 2 caractères)");
    }

    if (!entiteAgence || entiteAgence.trim().length < 2) {
      throw new BadRequestException("L'entité agence est obligatoire (min 2 caractères)");
    }

    if (!telephone) {
      throw new BadRequestException('Le téléphone est obligatoire');
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException("L'email est obligatoire et doit être valide");
    }

    if (!motDePasse || motDePasse.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }

    let photoFile: { value: Buffer; filename: string; mimetype: string } | undefined;

    if (body.photo) {
      const photoField = body.photo;

      if (
        photoField.value instanceof Buffer &&
        photoField.filename &&
        photoField.mimetype
      ) {
        photoFile = {
          value: photoField.value,
          filename: photoField.filename,
          mimetype: photoField.mimetype,
        };
        console.log('📸 Photo extraite:', {
          filename: photoFile.filename,
          mimetype: photoFile.mimetype,
          size: `${(photoFile.value.length / 1024).toFixed(1)} KB`,
        });
      } else {
        console.warn('⚠️ Champ photo présent mais format inattendu:', typeof photoField);
      }
    }

    const dto: CreatePartenaireProfileDto = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      entiteGroupe: entiteGroupe.trim(),
      entiteAgence: entiteAgence.trim(),
      telephone: telephone.trim(),
      email: email.toLowerCase().trim(),
      motDePasse,
      adresseAgence: adresseAgence?.trim() || undefined,
      ville: ville?.trim() || undefined,
    };

    console.log('✅ DTO construit:', { ...dto, motDePasse: '***' });

    return this.partenairesService.createProfilPartenaireFromToken(
      profileToken,
      codePartenaire,
      dto,
      photoFile,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un partenaire par ID' })
  @ApiResponse({ status: 200, description: 'Partenaire trouvé' })
  @ApiResponse({ status: 404, description: 'Partenaire introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partenairesService.findOne(id);
  }

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

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un partenaire' })
  @ApiResponse({ status: 200, description: 'Partenaire supprimé' })
  @ApiResponse({ status: 404, description: 'Partenaire introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.partenairesService.remove(id);
  }
}