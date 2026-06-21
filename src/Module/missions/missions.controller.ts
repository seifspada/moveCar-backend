import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto';

import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // ✅ Endpoint JSON sans fichiers (RECOMMANDÉ POUR VOS TESTS)
// missions.controller.ts

@Post('creer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent')
@UsePipes(new ValidationPipe({ transform: true }))
async creerMission(
  @Body() createMissionDto: CreateMissionDto,
  @Req() req: FastifyRequest & { user: any },  // ✅ Fastify
) {
  const agentIdFromToken = req.user.agentId;
  createMissionDto.agentId = agentIdFromToken;

  console.log('🔐 agentId forcé depuis JWT:', agentIdFromToken); // → 30

  const mission = await this.missionsService.creerMission(
    createMissionDto,
    undefined,
  );

  return {
    success: true,
    message: 'Mission créée avec succès',
    data: mission,
  };
}


  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async listerMissions(@Query() query: ListMissionsQueryDto) {
    const missions = await this.missionsService.listerMissions(
      query.partenaireId,
      query.statut,
    );

    return {
      success: true,
      count: missions.length,
      data: missions,
    };
  }

  @Get(':id')
  async obtenirMission(@Param('id') missionId: string) {
    const mission = await this.missionsService.obtenirMission(missionId);

    return {
      success: true,
      data: mission,
    };
  }

  @Patch(':id/note-agent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('agent')
  async noterMissionConvoyeur(
    @Param('id') missionId: string,
    @Body('note') note: number,
    @Req() req: FastifyRequest & { user: any },
  ) {
    const mission = await this.missionsService.noterMissionConvoyeur(
      missionId,
      Number(note),
      req.user.agentId,
    );

    return {
      success: true,
      message: 'Note agent et score ML enregistres avec succes',
      data: mission,
    };
  }

  @Patch(':id/statut')
  @UsePipes(new ValidationPipe())
  async mettreAJourStatut(
    @Param('id') missionId: string,
    @Body() updateStatusDto: UpdateMissionStatusDto,
  ) {
    const mission = await this.missionsService.mettreAJourStatut(
      missionId,
      updateStatusDto.statut,
    );

    return {
      success: true,
      message: 'Statut mis à jour avec succès',
      data: mission,
    };
  }

  @Delete(':id')
  async supprimerMission(@Param('id') missionId: string) {
    const result = await this.missionsService.supprimerMission(missionId);

    return {
      success: true,
      ...result,
    };
  }
}
