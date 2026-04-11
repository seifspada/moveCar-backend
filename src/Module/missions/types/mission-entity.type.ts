import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { TypeVehicule, TypeCarburant, BoiteVitesse, TypeLieu, StatutMission } from '@prisma/client';

// ================== ENUMS ==================

registerEnumType(StatutMission, { name: 'StatutMission' });
registerEnumType(TypeVehicule, { name: 'TypeVehicule' });
registerEnumType(TypeCarburant, { name: 'TypeCarburant' });
registerEnumType(BoiteVitesse, { name: 'BoiteVitesse' });
registerEnumType(TypeLieu, { name: 'TypeLieu' });

// ================== ENTITÉS ==================

@ObjectType()
class PartenaireMissionEntity {
  @Field(() => Int)
  id: number;

  @Field()
  nom: string;

  @Field()
  prenom: string;

  @Field()
  entiteGroupe: string;

  @Field({ nullable: true })
  entiteAgence?: string;

  @Field()
  email: string;

  @Field()
  telephone: string;

  @Field({ nullable: true })
  logo?: string;
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

// ✅ Entité fichier (remplace cheminFichier direct sur Document)
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

// ✅ Document sans cheminFichier direct — utilise fichiers[]
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

// ================== MISSION ENTITY PRINCIPALE ==================

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

  @Field(() => PartenaireMissionEntity)
  partenaire: PartenaireMissionEntity;

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
}