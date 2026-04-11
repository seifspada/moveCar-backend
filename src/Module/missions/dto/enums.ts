// missions/dto/enums.ts

import { registerEnumType } from '@nestjs/graphql';

export enum TypeVehiculeEnum {
  CITADINE = 'CITADINE',
  BERLINE = 'BERLINE',
  COMPACTE = 'COMPACTE',
  CABRIOLET = 'CABRIOLET',
  MONOSPACE = 'MONOSPACE',
  LUXE = 'LUXE',
  VU_3M3 = 'VU_3M3',
  VU_6M3 = 'VU_6M3',
  VU_9M3 = 'VU_9M3',
  VU_12M3 = 'VU_12M3',
  VU_15M3 = 'VU_15M3',
  VU_20M3 = 'VU_20M3',
  VU_25M3 = 'VU_25M3',
  VU_30M3 = 'VU_30M3',
}

export enum TypeCarburantEnum {
  ESSENCE = 'ESSENCE',
  DIESEL = 'DIESEL',
  HYBRIDE = 'HYBRIDE',
  ELECTRIQUE = 'ELECTRIQUE',
}

registerEnumType(TypeVehiculeEnum, {
  name: 'TypeVehicule',
  description: 'Types de véhicules disponibles',
});

registerEnumType(TypeCarburantEnum, {
  name: 'TypeCarburant',
  description: 'Types de carburant disponibles',
});
