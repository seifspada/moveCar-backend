import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ScoresMlService } from './scores-ml.service';
import { ScoreParametersDto, ScoreParametersSummaryDto } from './dto/export-score-parameters.dto';

@Controller('score-ml')
export class ScoresMlController {
  private readonly logger = new Logger(ScoresMlController.name);

  constructor(private readonly scoresMlService: ScoresMlService) {}

  /**
   * Exporte les paramètres de score logistique pour une mission spécifique
   * 
   * Utilisation:
   * GET /score-ml/export/mission/{missionId}
   * 
   * Réponse: Object contenant tous les paramètres du score
   * - Age du conducteur
   * - Retard de départ/arrivée
   * - Distance
   * - Conditions météo
   * - Etc...
   */
  @Get('export/mission/:missionId')
  async exportMissionScoreParameters(
    @Param('missionId') missionId: string,
  ): Promise<ScoreParametersDto> {
    this.logger.log(`Export des parametres de score pour mission: ${missionId}`);
    return this.scoresMlService.exportScoreParameters(missionId);
  }

  /**
   * Exporte les paramètres de score logistique pour plusieurs missions
   * 
   * Utilisation:
   * GET /score-ml/export/missions?ids=mission1,mission2,mission3
   * 
   * Réponse: Array d'objets avec résumé des paramètres principaux
   */
  @Get('export/missions')
  async exportMultipleMissionsScoreParameters(
    @Query('ids') ids: string,
  ): Promise<ScoreParametersSummaryDto[]> {
    if (!ids || !ids.trim()) {
      throw new Error('Parametre "ids" requis: GET /score-ml/export/missions?ids=id1,id2,id3');
    }

    const missionIds = ids.split(',').map((id) => id.trim());
    this.logger.log(
      `Export des parametres de score pour ${missionIds.length} missions: ${missionIds.join(', ')}`,
    );

    return this.scoresMlService.exportScoreParametersForMissions(missionIds);
  }

  /**
   * Endpoint de test pour vérifier que le service est actif
   * 
   * Utilisation:
   * GET /score-ml/health
   */
  @Get('health')
  async health(): Promise<{ status: string; message: string }> {
    return {
      status: 'OK',
      message: 'Service Score ML actif - Export de parametres disponible',
    };
  }
}
