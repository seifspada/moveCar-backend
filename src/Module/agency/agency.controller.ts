import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, ParseIntPipe,
  UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgencyService } from './agency.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { AgenceType } from './types/agence.type';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AgentService } from '../agent/agent.service';
import { ChangeAgentDto } from './dto/change-agent.dto';

@ApiTags('Agencies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agencies')
export class AgencyController {
  constructor(private readonly agencyService: AgencyService,

    private readonly agentService: AgentService, // 🟡 injecté pour vérifier doublon email dans agents
  ) {}

  private getPartenaireId(req: FastifyRequest): number {
    const user: any = (req as any).user;
    if (!user) throw new UnauthorizedException('Token manquant ou invalide');

    // 🟡 FIX: priorité claire sans fallback sur sub
    const partenaireId = user?.partenaire?.id ?? user?.partenaireId;
    if (!partenaireId) throw new UnauthorizedException('Partenaire non trouvé dans le token');

    return partenaireId;
  }

  @Post()
  @Roles('PARTENAIRE')
  @ApiOperation({ summary: 'Créer une agence (PARTENAIRE uniquement)' })
  @ApiResponse({ status: 201, type: AgenceType })
  async create(@Body() dto: CreateAgencyDto, @Req() req: FastifyRequest) {
    const partenaireId = this.getPartenaireId(req);
    return this.agencyService.create(dto, partenaireId);
  }

  @Get()
  @Roles('PARTENAIRE', 'ADMIN')
  @ApiOperation({ summary: 'Lister les agences' })
  @ApiResponse({ status: 200, type: [AgenceType] })
  findAll(@Req() req: FastifyRequest) {
    const partenaireId = this.getPartenaireId(req);
    return this.agencyService.findAll(partenaireId);
  }

  @Get(':id')
  @Roles('PARTENAIRE', 'ADMIN')
  @ApiOperation({ summary: "Détail d'une agence" })
  @ApiResponse({ status: 200, type: AgenceType })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: FastifyRequest) {
    const partenaireId = this.getPartenaireId(req);
    return this.agencyService.findOne(id, partenaireId);
  }

  @Patch(':id')
  @Roles('PARTENAIRE')
  @ApiOperation({ summary: 'Mettre à jour une agence' })
  @ApiResponse({ status: 200, type: AgenceType })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgencyDto,
    @Req() req: FastifyRequest,
  ) {
    const partenaireId = this.getPartenaireId(req);
    return this.agencyService.update(id, dto, partenaireId);
  }

  @Delete(':id')
  @Roles('PARTENAIRE')
  @ApiOperation({ summary: 'Supprimer une agence' })
  @ApiResponse({ status: 200, type: AgenceType })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: FastifyRequest) {
    const partenaireId = this.getPartenaireId(req);
    return this.agencyService.remove(id, partenaireId);
  }

  @Patch(':id/toggle-active')
    @Roles('PARTENAIRE')
@ApiOperation({ summary: 'Activer / Désactiver une agence' })
@ApiResponse({ status: 200, description: 'Statut modifié avec succès' })
@ApiResponse({ status: 404, description: 'Agence introuvable' })
toggleActive(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: any,
) {
  const partenaireId = req.user.partenaireId; // ✅ selon ton auth
  return this.agencyService.toggleActive(id, partenaireId);
}

@Get(':id/agent')
  @Roles('PARTENAIRE')
@ApiOperation({ summary: 'Récupérer l\'agent lié à une agence' })
@ApiResponse({ status: 200, description: 'Agent trouvé' })
@ApiResponse({ status: 404, description: 'Aucun agent lié' })
async getAgent(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: any,
) {
  const partenaireId = req.user.partenaireId;
  await this.agencyService.findOne(id, partenaireId);
  return this.agentService.findByAgenceId(id);
}

// ✅ POST /agencies/:id/resend-invitation
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Post(':id/resend-invitation')
@ApiOperation({ summary: 'Regénérer le token et renvoyer l\'email de profil' })
@ApiResponse({ status: 200, description: 'Nouveau token généré + email renvoyé' })
@ApiResponse({ status: 404, description: 'Agence ou agent introuvable' })
@ApiResponse({ status: 409, description: 'Profil déjà complété' })
resendInvitation(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: any,
) {
  const partenaireId = req.user.partenaireId;
  return this.agentService.resendInvitation(id, partenaireId);
}


@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Patch(':id/change-agent')
@ApiOperation({ summary: 'Changer l\'agent d\'une agence' })
changeAgent(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: ChangeAgentDto,
  @Req() req: any,
) {
  return this.agencyService.changeAgent(id, body.email, req.user.partenaireId);
}

}
