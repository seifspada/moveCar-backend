import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { ContratTarificationType } from './types/contrat-tarification.type';
import { DemandePartenaireService } from './demande-partenaire.service';

@Resolver()
export class DemandePartenaireResolver {
  constructor(private readonly service: DemandePartenaireService) {}

  @Query(() => ContratTarificationType)
  async contratTarification(
    @Args('demandeId', { type: () => Int }) demandeId: number,
  ): Promise<ContratTarificationType> {
    return this.service.getContratTarification(demandeId);
  }
}