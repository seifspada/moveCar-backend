// src/Module/alertes/dto/update-alerte.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAlerteGeographiqueInput } from './create-alerte-geographique.input';

export class UpdateAlerteDto extends PartialType(CreateAlerteGeographiqueInput) {}
