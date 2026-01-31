import { PartialType } from '@nestjs/mapped-types';
import { CreateDemandePartenaireDto } from './create-demande-partenaire.dto';

export class UpdateDemandePartenaireDto extends PartialType(CreateDemandePartenaireDto) {}
