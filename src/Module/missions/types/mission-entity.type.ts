import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { TypeVehicule, TypeCarburant, BoiteVitesse, TypeLieu, StatutMission } from '@prisma/client';

registerEnumType(StatutMission, { name: 'StatutMission' });
registerEnumType(TypeVehicule, { name: 'TypeVehicule' });
registerEnumType(TypeCarburant, { name: 'TypeCarburant' });
registerEnumType(BoiteVitesse, { name: 'BoiteVitesse' });
registerEnumType(TypeLieu, { name: 'TypeLieu' });


// ✅ PartenaireMissionEntity → AgentMissionEntity
@ObjectType()
class AgentMissionEntity {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  nom?: string;

  @Field({ nullable: true })
  prenom?: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  telephone?: string;

  @Field({ nullable: true })
  photo?: string;
}
@ObjectType()
export class ContratTarificationEntity {
  @Field(() => Float, { nullable: true })
  prixParKm: number;

  @Field(() => Float, { nullable: true })
  depassementKilometrage: number;

  @Field(() => Float, { nullable: true })
  retardSansAvertissement: number;

  @Field(() => Float, { nullable: true })
  restitutionAutreEndroit: number;
}

@ObjectType()
class PartenaireMissionEntity {
  @Field(() => Int)
  id: number;

  @Field()
  entiteGroupe: string;
}

@ObjectType()
class VehiculeMissionEntity {
  @Field()
  id: string;

  @Field(() => TypeVehicule)
  typeVehicule: TypeVehicule;

  @Field(() => TypeCarburant)
  typeCarburant: TypeCarburant;

  @Field()
  marqueModele: string;

  @Field()
  immatriculation: string;

  @Field(() => Int)
  nombrePlaces: number;

  @Field(() => BoiteVitesse)
  boiteVitesse: BoiteVitesse;
}


@ObjectType()
class AdresseEntity {
  @Field()
  id: string;

  @Field()
  villeNom: string;

  @Field()
  adresseComplete: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => TypeLieu)
  typeLieu: TypeLieu;

  @Field({ nullable: true })
  nomLieu?: string;
}


@ObjectType()
class DisponibiliteEntity {
  @Field()
  id: string;

  @Field()
  dateDebut: Date;

  @Field()
  dateFin: Date;

  @Field({ nullable: true })
  dateDepartMax?: Date;
}


@ObjectType()
class CalculEntity {
  @Field()
  id: string;

  @Field(() => Float)
  distanceKm: number;

  @Field(() => Float)
  fraisPeage: number;

  @Field(() => Float)
  montantTotal: number;
}


@ObjectType()
class NotificationEntity {
  @Field()
  id: string;

  @Field()
  typeNotification: string;

  @Field()
  actif: boolean;

  @Field({ nullable: true })
  nomContact?: string;

  @Field({ nullable: true })
  telephoneContact?: string;
}


@ObjectType()
class FichierDocumentEntity {
  @Field(() => Int)
  id: number;

  @Field()
  cheminFichier: string;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}


@ObjectType()
class DocumentEntity {
  @Field(() => Int)
  id: number;

  @Field()
  typeDocument: string;

  @Field({ nullable: true })
  numero?: string;

  @Field({ nullable: true })
  dateDebutValidite?: Date;

  @Field({ nullable: true })
  dateFinValidite?: Date;

  @Field({ nullable: true })
  statut?: string;

  @Field(() => [FichierDocumentEntity])
  fichiers: FichierDocumentEntity[];

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;
}


@ObjectType()
export class MissionEntity {
  @Field(() => ID)
  id: string;

  @Field(() => StatutMission)
  statut: StatutMission;

  @Field({ nullable: true })
  commentaire?: string;

  @Field()
  dateCreation: Date;

  @Field()
  dateModification: Date;

  @Field(() => PartenaireMissionEntity, { nullable: true })
  partenaire?: PartenaireMissionEntity;

  // ✅ partenaire → agent (nullable car partenaireId est optionnel)
  @Field(() => AgentMissionEntity)
  agent: AgentMissionEntity;

  @Field(() => VehiculeMissionEntity)
  vehicule: VehiculeMissionEntity;

  @Field(() => AdresseEntity)
  adresseDepart: AdresseEntity;

  @Field(() => AdresseEntity)
  adresseArrivee: AdresseEntity;

  @Field(() => DisponibiliteEntity, { nullable: true })
  disponibilite?: DisponibiliteEntity;

  @Field(() => CalculEntity, { nullable: true })
  calculs?: CalculEntity;

  @Field(() => [NotificationEntity])
  notifications: NotificationEntity[];

  @Field(() => [DocumentEntity])
  documents: DocumentEntity[];

   @Field(() => ContratTarificationEntity, { nullable: true })
  contrat?: ContratTarificationEntity;

  // ── Champs Machine Learning ──
  @Field(() => Float, { nullable: true })
  scoreLogistique?: number;

  @Field({ nullable: true })
  scorePredictedLabel?: string;

  @Field({ nullable: true })
  scoreCalculatedAt?: Date;

  @Field(() => Float, { nullable: true })
  noteAgent?: number;
}
