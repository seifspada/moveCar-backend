// src/Module/missions/missions.resolver.ts - COMPLET avec createMission mutation
import {
  Resolver,
  Query,
  Mutation,
  ResolveField,
  Parent,
  Args,
  Int,
  Context,
} from '@nestjs/graphql';
import {
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { MissionsService, MissionWithRelations } from './missions.service';
import { Decimal } from '@prisma/client/runtime/library';
import { MissionCardType } from './types/mission-minimal.type';
import { MissionsPaginatedResponse } from './types/mission-paginate-response';
import {
  SearchByPositionInput,
  SearchByTrajetInput,
} from './types/mission-search-filters.input';
import { MissionEntity } from './types/mission-entity.type';
import { CreateMissionInput } from './inputs/create-mission.input';
import { PrismaService } from '../../prisma/prisma.service';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Resolver(() => MissionCardType)
export class MissionsResolver {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  //  QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * ✅ Recherche par position (adhérent connecté)
   */
  @Query(() => MissionsPaginatedResponse)
  @UseGuards(GqlAuthGuard)
  async searchMissionsByPosition(
    @CurrentUser() user: any,
    @Args('filters', { type: () => SearchByPositionInput })
    filters: any,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true })
    pageSize?: number,
  ): Promise<MissionsPaginatedResponse> {
    const actualPage = page ?? 1;
    const actualPageSize = pageSize ?? 20;

    if (!filters || Object.keys(filters).length === 0) {
      throw new BadRequestException('Les filtres de recherche sont manquants');
    }
    if (
      !filters.villeNom ||
      !filters.latitude ||
      !filters.longitude ||
      !filters.rayon
    ) {
      throw new BadRequestException(
        'Tous les champs sont obligatoires : villeNom, latitude, longitude, rayon',
      );
    }

    const typedFilters: SearchByPositionInput = {
      villeNom: filters.villeNom,
      latitude: Number(filters.latitude),
      longitude: Number(filters.longitude),
      rayon: Number(filters.rayon),
    };

    const userId = user?.id || user?.sub;
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
      select: { id: true },
    });

    const { missions, total } =
      await this.missionsService.searchMissionsByPosition(
        typedFilters,
        actualPage,
        actualPageSize,
        adherent?.id,
      );

    return {
      missions: missions as any,
      total,
      page: actualPage,
      pageSize: actualPageSize,
      totalPages: Math.ceil(total / actualPageSize),
    };
  }

  /**
   * ✅ Missions pour cartes — adhérent connecté
   */
  @Query(() => [MissionCardType])
  @UseGuards(GqlAuthGuard)
  async missionsForCards(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub;
    console.log('👤 user:', user);
    console.log('👤 userId:', userId);

    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
      select: { id: true },
    });
    console.log('👤 adherent:', adherent);

    const result = await this.missionsService.getMissionsForCards(adherent?.id);
    console.log('✅ missions count:', result.length);

    return result;
  }

  /**
   * ✅ Missions par agence — admin/agent
   */
  @Query(() => [MissionCardType], {
    name: 'getMissionsForCardsByAgence',
    description: 'Toutes les missions sans filtre (admin/agent)',
  })
  async getMissionsForCardsByAgence(): Promise<MissionWithRelations[]> {
    return this.missionsService.getMissionsForCards();
  }

  /**
   * ✅ Recherche simple (adhérent connecté)
   */
  @Query(() => MissionsPaginatedResponse)
  @UseGuards(GqlAuthGuard)
  async searchMissions(
    @CurrentUser() user: any,
    @Args('search', { nullable: true }) search?: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page = 1,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 }) pageSize = 20,
  ): Promise<MissionsPaginatedResponse> {
    const userId = user?.id || user?.sub;
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
      select: { id: true },
    });

    const { missions, total } = await this.missionsService.searchMissions(
      search,
      page,
      pageSize,
      adherent?.id,
    );

    return {
      missions: missions as any,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * ✅ Recherche par trajet (adhérent connecté)
   */
  @Query(() => MissionsPaginatedResponse)
  @UseGuards(GqlAuthGuard)
  async searchMissionsByTrajet(
    @CurrentUser() user: any,
    @Args('filters', { type: () => SearchByTrajetInput }) filters: any,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
  ): Promise<MissionsPaginatedResponse> {
    const actualPage = page ?? 1;
    const actualPageSize = pageSize ?? 20;

    if (!filters || Object.keys(filters).length === 0) {
      throw new BadRequestException('Les filtres de recherche sont manquants');
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

    const userId = user?.id || user?.sub;
    const adherent = await this.prisma.adherent.findUnique({
      where: { userId },
      select: { id: true },
    });

    const { missions, total } = await this.missionsService.searchMissionsByTrajet(
      typedFilters,
      actualPage,
      actualPageSize,
      adherent?.id,
    );

    return {
      missions: missions as any,
      total,
      page: actualPage,
      pageSize: actualPageSize,
      totalPages: Math.ceil(total / actualPageSize),
    };
  }

  /**
   * ✅ Mission par ID
   */
  @Query(() => MissionEntity, { nullable: true })
  async getMissionById(
    @Args('id', { type: () => String }) id: string,
    @Context() context: any,
  ): Promise<MissionEntity> {
    if (!id) throw new BadRequestException('ID requis');
    const mission = await this.missionsService.findMissionById(id);
    if (!mission) throw new BadRequestException('Mission non trouvée');
    return mission;
  }

  // ─────────────────────────────────────────────────────────────
  //  MUTATIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * ✅ Créer une mission (PRINCIPALE)
   */
  @Mutation(() => MissionEntity)
  async createMission(
    @Args('input', { type: () => CreateMissionInput })
    input: CreateMissionInput,
  ): Promise<MissionEntity> {
    console.log('🚀 Mutation: createMission');

    if (!input) {
      throw new BadRequestException('Input requis');
    }

    // Convertir en CreateMissionDto si nécessaire
    const result = await this.missionsService.creerMission(input as any);
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  //  RESOLVE FIELDS
  // ─────────────────────────────────────────────────────────────

  @ResolveField()
  id(@Parent() mission: MissionWithRelations) {
    return mission.id;
  }

  @ResolveField()
  typeVehicule(@Parent() mission: MissionWithRelations) {
    const type = mission.vehicule?.typeVehicule;
    if (!type) {
      console.warn(`⚠️ [Resolver] mission ${mission.id} : vehicule ou typeVehicule est null/undefined`);
    }
    return type ?? 'BERLINE';
  }

  @ResolveField()
  typeCarburant(@Parent() mission: MissionWithRelations) {
    const type = mission.vehicule?.typeCarburant;
    if (!type) {
      console.warn(`⚠️ [Resolver] mission ${mission.id} : vehicule ou typeCarburant est null/undefined`);
    }
    return type ?? 'ESSENCE';
  }

  @ResolveField()
  villeDepart(@Parent() mission: MissionWithRelations) {
    return mission.adresseDepart?.villeNom ?? 'N/A';
  }

  @ResolveField()
  villeArrivee(@Parent() mission: MissionWithRelations) {
    return mission.adresseArrivee?.villeNom ?? 'N/A';
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

  @ResolveField(() => Date, { nullable: true })
  dateDebut(@Parent() mission: MissionWithRelations): Date | null {
    return mission.disponibilite?.dateDebut ?? null;
  }

  @ResolveField(() => Date, { nullable: true })
  dateDepartMax(@Parent() mission: MissionWithRelations): Date | null {
    return mission.disponibilite?.dateDepartMax ?? null;
  }

  // ─────────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────────

  private decimalToNumber(value: Decimal | number): number {
    if (typeof value === 'number') return value;
    return (value as any).toNumber();
  }
}