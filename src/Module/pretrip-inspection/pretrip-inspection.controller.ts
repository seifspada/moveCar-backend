import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '../../auth/enum/role.enum';
import { PreTripInspectionService } from './pretrip-inspection.service';
import { TypeMediaInspection } from './enum/pretrip-inspection.enums';

@Controller('pretrip-inspection')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreTripInspectionController {
  constructor(
    private readonly pretripService: PreTripInspectionService,
  ) {}

  /**
   * Upload d'une photo via multipart/form-data.
   * Endpoint : POST /pretrip-inspection/:inspectionId/media/:typeMedia
   */
  @Post(':inspectionId/media/:typeMedia')
  @Roles(Role.ADHERENT)
  async uploadMedia(
    @Param('inspectionId') inspectionId: string,
    @Param('typeMedia') typeMedia: TypeMediaInspection,
    @Req() req: FastifyRequest,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    // Validation du type de média
    if (!Object.values(TypeMediaInspection).includes(typeMedia)) {
      throw new BadRequestException(`Type de média invalide : ${typeMedia}`);
    }

    // Récupération du fichier depuis Fastify multipart
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    // Conversion en Buffer
    const buffer = await file.toBuffer();

    // Délégation au service
    return this.pretripService.uploadMedia(
      inspectionId,
      typeMedia,
      buffer,
      file.mimetype,
      user.id,
    );
  }
}