// src/Module/demande-partenaire/gateways/demande-partenaire.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatutDemande } from '@prisma/client';

@WebSocketGateway({ cors: { origin: '*' } })
export class DemandePartenaireGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  // ✅ À la connexion → envoyer UNIQUEMENT les demandes EN_ATTENTE
  async handleConnection(client: Socket) {
    console.log('✅ Client partenaire connecté:', client.id);

    const demandes = await this.prisma.demandePartenaire.findMany({
      where: { statutDemande: StatutDemande.EN_ATTENTE },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id:        true,
        email:     true,
        nom:       true,
        entite:    true,
        createdAt: true,
      },
    });

    client.emit('historique-demandes-partenaire', {
      type: 'partenaire',
      demandes: demandes.map((d) => ({
        id:        d.id,
        email:     d.email,
        message:   `Demande partenaire de ${d.nom} — ${d.entite}`,
        timestamp: d.createdAt.toISOString(),
      })),
    });
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Client partenaire déconnecté:', client.id);
  }

  // ✅ Nouvelle demande EN_ATTENTE → ajouter dans la liste
  notifyNewDemande(data: {
    email:    string;
    id:       number;
    nom:      string;
    entite:   string;
    message?: string;
  }) {
    this.server.emit('new-demande-partenaire', {
      ...data,
      type:      'partenaire',
      timestamp: new Date().toISOString(),
    });
  }

  // ✅ Statut changé → EN_ATTENTE ajouté pour le cas du report
  notifyStatutChange(data: {
    id:     number;
    statut: 'EN_ATTENTE' | 'EN_COURS_TRAITEMENT' | 'ACCEPTEE' | 'REFUSEE';
  }) {
    this.server.emit('demande-partenaire-statut-change', {
      ...data,
      type:      'partenaire',
      timestamp: new Date().toISOString(),
    });
  }
}