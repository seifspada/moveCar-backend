import { 
  Controller, 
  Post, 
  Patch, 
  Param, 
  Body, 
  Req, 
  ParseIntPipe, 
  BadRequestException, 
  Get,
  Delete, // ✅ Ajouter pour la suppression
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { AdherentService } from './adherent.service';
import {  CreateAdherentProfileDto } from './dto/create-profile-adherent.dto';
import { UpdateAdherentDto } from './dto/update-adherent.dto';
import { FastifyRequest } from 'fastify';

interface FastifyFileKV {
  value: Buffer;
  filename: string;
  mimetype: string;
}

@ApiTags('Adherents')
@Controller('adherent') // ✅ Correct : sans "s"
export class AdherentController {
  constructor(private readonly adherentService: AdherentService) {}

// adherent.controller.ts
@Post('creer-profil/:profileToken')
@ApiOperation({ summary: 'Créer un profil adhérent à partir d’une demande validée' })
@ApiConsumes('multipart/form-data')
@ApiResponse({ status: 201, description: 'Adhérent créé avec succès' })
@ApiResponse({ status: 400, description: 'Données incorrectes ou demande non valide' })
@ApiResponse({ status: 404, description: 'Demande introuvable ou expirée' })
async createProfilAdherent(
  @Param('profileToken') profileToken: string,
  @Query('code') code: string, // optionnel, si tu ajoutes un code sur la demande
  @Req() req: FastifyRequest,
  @Body() dto: CreateAdherentProfileDto,
) {
  const body: any = req.body;

  let photoFile: FastifyFileKV | undefined;
  if (body.photo) {
    if (Array.isArray(body.photo)) {
      if (body.photo.length > 1) {
        throw new BadRequestException('photo doit contenir 1 seul fichier');
      }
      photoFile = body.photo[0];
    } else {
      photoFile = body.photo;
    }
  }

  if (!photoFile) {
    throw new BadRequestException('La photo est obligatoire');
  }

  return this.adherentService.createProfilAdherentFromToken(
    profileToken,
    code,
    dto,
    photoFile,
  );
}


  // ✅ Route 3 : Liste des adhérents
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les adhérents' })
  @ApiResponse({ status: 200, description: 'Liste des adhérents' })
  findAll() {
    return this.adherentService.findAll();
  }

  // ✅ Route 4 : Détails d'un adhérent
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un adhérent par ID' })
  @ApiResponse({ status: 200, description: 'Adhérent trouvé' })
  @ApiResponse({ status: 404, description: 'Adhérent introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adherentService.findOne(id);
  }

  // ✅ Route 5 : Mise à jour
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un adhérent' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Adhérent mis à jour' })
  @ApiResponse({ status: 404, description: 'Adhérent introuvable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Body() dto: UpdateAdherentDto,
  ) {
    const body: any = req.body;

    let photoFile: FastifyFileKV | undefined;
    
    if (body.photo) {
      if (Array.isArray(body.photo)) {
        photoFile = body.photo[0];
      } else {
        photoFile = body.photo;
      }
    }

    return this.adherentService.update(id, dto, photoFile);
  }

  // ✅ Route 6 : Suppression
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un adhérent' })
  @ApiResponse({ status: 200, description: 'Adhérent supprimé' })
  @ApiResponse({ status: 404, description: 'Adhérent introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adherentService.remove(id);
  }
}
