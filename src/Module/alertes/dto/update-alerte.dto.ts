// src/Module/alertes/dto/update-alerte.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAlerteGeographiqueDto } from './create-alerte-geographique.input';

export class UpdateAlerteDto extends PartialType(CreateAlerteGeographiqueDto) {}
