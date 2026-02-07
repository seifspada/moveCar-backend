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
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionStatusDto } from './dto/update-mission-status.dto';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // ✅ Endpoint JSON sans fichiers (RECOMMANDÉ POUR VOS TESTS)
  @Post('creer')
  @UsePipes(new ValidationPipe({ transform: true }))
  async creerMission(@Body() createMissionDto: CreateMissionDto) {
    const mission = await this.missionsService.creerMission(
      createMissionDto,
      undefined, // Pas de documents
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
