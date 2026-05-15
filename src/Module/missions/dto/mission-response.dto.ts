export interface MissionResponseDto {
  id: string;
  statut: string;
  commentaire?: string;
  dateCreation: Date;
  dateModification: Date;
  partenaireId: number;  // ✅ Ajouté
   agent: {                          // ← ajout
    id: number;
    user: {
      id: number;
      email: string;
      adherent?: {
        nom?: string;
        prenom?: string;
        telephone?: string;
        photo?: string;
      };
    };
  };
  vehicule: {
    id: string;
    typeVehicule: string;
    typeCarburant: string;
    marqueModele: string;
    immatriculation: string;
    nombrePlaces: number;
    boiteVitesse: string;
    dateCreation: Date;
    dateModification: Date;
    partenaireId: number;
  };
  
  adresseDepart: {
    id: string;
    villeId: string;
    villeNom: string;
    adresseComplete: string;
    typeLieu: string;
    nomLieu?: string;
    latitude: number;
    longitude: number;
    dateCreation: Date;
    dateModification: Date;
  };
  
  adresseArrivee: {
    id: string;
    villeId: string;
    villeNom: string;
    adresseComplete: string;
    typeLieu: string;
    nomLieu?: string;
    latitude: number;
    longitude: number;
    dateCreation: Date;
    dateModification: Date;
  };
  
  disponibilite: {
    id: string;
    dateDebut: Date;
    dateFin: Date;
    missionId: string;
  };
  
  notifications: Array<{
    id: string;
    typeNotification: string;
    actif: boolean;
    nomContact?: string;
    telephoneContact?: string;
    missionId: string;
  }>;
  
  calculs: {
    id: string;
    distanceKm: string;  // ✅ Decimal devient string en JSON
    fraisPeage: string;  // ✅ Decimal devient string en JSON
    montantTotal: string;  // ✅ Decimal devient string en JSON
    detailCalcul: {
      distanceKm: number;
      dureeFormatee: string;  // ✅ CORRIGÉ : plus de dureeSecondes
      fraisPeage: number;
      prixParKm: number;
      montantTotal: number;
      typeVehicule: string;
    };
    dateCalcul: Date;
    dateModification: Date;
    missionId: string;
  };
  
  documents: Array<{
    id: string;
    typeDocument: string;
    cheminFichier: string;
    dateCreation: Date;
    missionId: string;
  }>;
}
