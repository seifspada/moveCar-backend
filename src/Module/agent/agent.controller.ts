import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { UpdateAgentDto } from './dto/update-agent.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AgencyService } from '../agency/agency.service';

@ApiTags('Agents')
@Controller('agents')
export class AgentController {
  constructor
  (private readonly agentService: AgentService,
  ) {}

  // ─── Routes publiques ──────────────────────────────────────────────────────

  @Get('verify-token/:token')
  @ApiOperation({ summary: 'Vérifier le token agent (public)' })
  async verifyToken(@Param('token') token: string) {
    return this.agentService.verifyProfileToken(token);
  }

@Post('complete-profile/:token')
@ApiOperation({ summary: 'Compléter le profil agent (public)' })
@ApiConsumes('multipart/form-data')
async completeProfile(
  @Param('token') token: string,
  @Req() req: FastifyRequest,
) {
  const body: any = req.body; // ✅ correct avec attachFieldsToBody: 'keyValues'

  // ✅ Champs texte — Fastify les envoie directement comme string
  const password        = body?.password        ?? '';
  const confirmPassword = body?.confirmPassword ?? '';
  const nom             = body?.nom             ?? undefined;
  const prenom          = body?.prenom          ?? undefined;
  const telephone       = body?.telephone       ?? undefined;
  const adresseAgence   = body?.adresseAgence   ?? undefined;
  const ville           = body?.ville           ?? undefined;

  // ✅ Fichier photo — structure { filename, mimetype, value: Buffer }
  const photoFile     = body?.photo;
  const photoBuffer   = photoFile?.value instanceof Buffer ? photoFile.value : undefined;
  const photoFilename = photoFile?.filename ?? undefined;

  return this.agentService.completeProfile(
    token,
    password,
    confirmPassword,
    nom,
    prenom,
    telephone,
    adresseAgence,
    ville,
    photoBuffer,
    photoFilename,
  );
}


  // ─── Routes protégées (JWT) ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Lister tous les agents du partenaire' })
  async findAll(@Req() req: any) {
    const partenaireId: number = req.user.partenaireId; // ✅ accès direct
    return this.agentService.findAll(partenaireId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: "Profil de l'agent connecté" })
  async getMe(@Req() req: any) {
    const id: number = req.user.id; // ✅ accès direct
    return this.agentService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un agent" })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const partenaireId: number = req.user.partenaireId; // ✅ accès direct
    return this.agentService.findOne(id, partenaireId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: "Modifier un agent" })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgentDto,
    @Req() req: any,
  ) {
    const partenaireId: number = req.user.partenaireId; // ✅ accès direct
    return this.agentService.update(id, dto, partenaireId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un agent" })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const partenaireId: number = req.user.partenaireId; // ✅ accès direct
    return this.agentService.remove(id, partenaireId);
  }

  // ✅ GET /agencies/:id/agent — récupérer l'agent lié

}