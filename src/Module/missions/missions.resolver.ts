// missions/missions.resolver.ts
import { Resolver, Query, ResolveField, Parent, Args, Int, Float, Context } from '@nestjs/graphql';
import { MissionsService, MissionWithRelations, MissionWithRelationsFlat } from './missions.service';
import { Decimal } from '@prisma/client/runtime/library';
import { MissionCardType } from './types/mission-minimal.type';
import { MissionsPaginatedResponse } from './types/mission-paginate-response';
import { SearchByPositionInput, SearchByTrajetInput } from './types/mission-search-filters.input';
import { MissionEntity } from './types/mission-entity.type';
import { StatutMission } from '@prisma/client'; // ✅ Import enum Prisma

@Resolver(() => MissionCardType)
export class MissionsResolver {
  constructor(private readonly missionsService: MissionsService) {}

  // ✅ Query : Recherche par position
  @Query(() => MissionsPaginatedResponse)
  async searchMissionsByPosition(
    @Args('filters', { type: () => SearchByPositionInput }) filters: any,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
  ): Promise<MissionsPaginatedResponse> {

    const actualPage = page ?? 1;
    const actualPageSize = pageSize ?? 20;

    if (!filters || Object.keys(filters).length === 0) {
      throw new Error('Les filtres de recherche sont manquants');
    }

    if (!filters.villeNom || !filters.latitude || !filters.longitude || !filters.rayon) {
      throw new Error('Tous les champs sont obligatoires : villeNom, latitude, longitude, rayon');
    }

    const typedFilters: SearchByPositionInput = {
      villeNom: filters.villeNom,
      latitude: Number(filters.latitude),
      longitude: Number(filters.longitude),
      rayon: Number(filters.rayon),
    };

    const { missions, total } = await this.missionsService.searchMissionsByPosition(
      typedFilters,
      actualPage,
      actualPageSize,
    );

    const totalPages = Math.ceil(total / actualPageSize);

    return {
      missions: missions as any,
      total,
      page: actualPage,
      pageSize: actualPageSize,
      totalPages,
    };
  }

  // ✅ Query : Toutes les missions en cards
  @Query(() => [MissionCardType])
  async missionsForCards() {
    return this.missionsService.getMissionsForCards();
  }

  // ✅ Query : Recherche par texte avec pagination
  @Query(() => MissionsPaginatedResponse)
  async searchMissions(
    @Args('search', { nullable: true }) search?: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page = 1,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 }) pageSize = 20,
  ): Promise<MissionsPaginatedResponse> {

    const { missions, total } = await this.missionsService.searchMissions(
      search,
      page,
      pageSize,
    );

    return {
      missions: missions as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ✅ Query : Recherche par trajet
  @Query(() => MissionsPaginatedResponse)
  async searchMissionsByTrajet(
    @Args('filters', { type: () => SearchByTrajetInput }) filters: any,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
  ): Promise<MissionsPaginatedResponse> {

    const actualPage = page ?? 1;
    const actualPageSize = pageSize ?? 20;

    if (!filters || Object.keys(filters).length === 0) {
      throw new Error('Les filtres de recherche sont manquants');
    }

    const typedFilters: SearchByTrajetInput = {
      villeDepartNom: filters.villeDepartNom,
      latitudeDepart: Number(filters.latitudeDepart),
      longitudeDepart: Number(filters.longitudeDepart),
      villeArriveeNom: filters.villeArriveeNom,
      latitudeArrivee: Number(filters.latitudeArrivee),
      longitudeArrivee: Number(filters.longitudeArrivee),
      rayon: Number(filters.rayon),
      dateDepart: filters.dateDepart ? new Date(filters.dateDepart) : undefined,
      dateDepartMax: filters.dateDepartMax ? new Date(filters.dateDepartMax) : undefined,
    };

    const { missions, total } = await this.missionsService.searchMissionsByTrajet(
      typedFilters,
      actualPage,
      actualPageSize,
    );

    const totalPages = Math.ceil(total / actualPageSize);

    return {
      missions: missions as any,
      total,
      page: actualPage,
      pageSize: actualPageSize,
      totalPages,
    };
  }

  // ✅ Query : Mission par ID
  @Query(() => MissionEntity, { nullable: true })
  async getMissionById(
    @Args('id', { type: () => String }) id: string,
    @Context() context: any,
  ): Promise<MissionEntity> {

    if (!id) throw new Error('ID requis');

    const mission = await this.missionsService.findMissionById(id);

    if (!mission) {
      throw new Error('Mission non trouvée');
    }

    // ✅ CORRIGÉ : Utilisation de l'enum Prisma au lieu d'une string


    return mission;
  }

@Query(() => [MissionCardType])
async getMissionsByAgence(
  @Args('agenceId', { type: () => Int }) agenceId: number,
): Promise<MissionWithRelationsFlat[]> {  // ✅ MissionWithRelationsFlat
  return this.missionsService.getMissionsByAgence(agenceId);
}

  // ==================== RESOLVE FIELDS ====================

  @ResolveField()
  id(@Parent() mission: MissionWithRelations) {
    return mission.id;
  }

  @ResolveField()
  typeVehicule(@Parent() mission: MissionWithRelations) {
    return mission.vehicule.typeVehicule;
  }

  @ResolveField()
  typeCarburant(@Parent() mission: MissionWithRelations) {
    return mission.vehicule.typeCarburant;
  }

  @ResolveField()
  villeDepart(@Parent() mission: MissionWithRelations) {
    return mission.adresseDepart.villeNom;
  }

  @ResolveField()
  villeArrivee(@Parent() mission: MissionWithRelations) {
    return mission.adresseArrivee.villeNom;
  }

  @ResolveField(() => Number)
  distanceKm(@Parent() mission: MissionWithRelations) {
    if (!mission.calculs?.distanceKm) return 0;
    return this.decimalToNumber(mission.calculs.distanceKm);
  }

  @ResolveField(() => Number)
  fraisPeage(@Parent() mission: MissionWithRelations) {
    if (!mission.calculs?.fraisPeage) return 0;
    return this.decimalToNumber(mission.calculs.fraisPeage);
  }

  @ResolveField(() => Number)
  montantTotal(@Parent() mission: MissionWithRelations) {
    if (!mission.calculs?.montantTotal) return 0;
    return this.decimalToNumber(mission.calculs.montantTotal);
  }

  @ResolveField(() => Date)
  dateDebut(@Parent() mission: MissionWithRelations): Date | null {
    return mission.disponibilite?.dateDebut ?? null;
  }

  @ResolveField(() => Date, { nullable: true })
  dateDepartMax(@Parent() mission: MissionWithRelations): Date | null {
    return mission.disponibilite?.dateDepartMax ?? null;
  }

  // ==================== HELPERS ====================

  private decimalToNumber(value: Decimal | number): number {
    if (typeof value === 'number') return value;
    return (value as any).toNumber();
  }
}