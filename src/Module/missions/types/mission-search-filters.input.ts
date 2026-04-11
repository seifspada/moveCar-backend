// src/Module/missions/types/mission-search-filters.input.ts
import { InputType, Field, Float, Int } from '@nestjs/graphql';

@InputType()
export class SearchByPositionInput {
  @Field(() => String, { description: 'Nom de la ville de recherche' })
  villeNom!: string; // ✅ Ajoutez !

  @Field(() => Float, { description: 'Latitude GPS' })
  latitude!: number; // ✅ Ajoutez !

  @Field(() => Float, { description: 'Longitude GPS' })
  longitude!: number; // ✅ Ajoutez !

  @Field(() => Int, { description: 'Rayon de recherche en km' })
  rayon!: number; // ✅ Ajoutez !
}

@InputType()
export class SearchByTrajetInput {
  @Field(() => String)
  villeDepartNom!: string;

  @Field(() => Float)
  latitudeDepart!: number;

  @Field(() => Float)
  longitudeDepart!: number;

  @Field(() => String)
  villeArriveeNom!: string;

  @Field(() => Float)
  latitudeArrivee!: number;

  @Field(() => Float)
  longitudeArrivee!: number;

  @Field(() => Int)
  rayon!: number;

  @Field({ nullable: true })
  dateDepart?: Date;

  @Field({ nullable: true })
  dateDepartMax?: Date;
}
