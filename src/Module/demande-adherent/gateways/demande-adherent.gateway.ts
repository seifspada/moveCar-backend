// demande-adherent.gateway.ts
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
export class DemandeAdherentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  // ✅ À la connexion → envoyer UNIQUEMENT les demandes EN_ATTENTE
  async handleConnection(client: Socket) {
    console.log('✅ Client connecté:', client.id);

    const demandes = await this.prisma.demandeAdhesion.findMany({
      where: { statut: StatutDemande.EN_ATTENTE }, // ✅ filtre EN_ATTENTE
      orderBy: { dateCreation: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        dateCreation: true,
      },
    });

    client.emit('historique-demandes', {
      type: 'adherent',
      demandes: demandes.map((d) => ({
        id: d.id,
        email: d.email,
        message: `Demande de ${d.nom} ${d.prenom}`,
        timestamp: d.dateCreation.toISOString(),
      })),
    });
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Client déconnecté:', client.id);
  }

  // ✅ Notifier tous les clients d'une nouvelle demande (EN_ATTENTE)
  notifyNewDemande(data: {
    email: string;
    id: number;
    nom: string;       // ✅ ajouter nom/prenom pour afficher le message
    prenom: string;
    message?: string;
  }) {
    this.server.emit('new-demande', {
      ...data,
      type: 'adherent',
      timestamp: new Date().toISOString(),
    });
  }

  // ✅ NOUVEAU — Notifier que la demande a changé de statut → retirer de la liste
  notifyStatutChange(data: {
    id: number;
    statut: 'ACCEPTEE' | 'REFUSEE';
  }) {
    this.server.emit('demande-statut-change', {
      ...data,
      type: 'adherent',
      timestamp: new Date().toISOString(),
    });
  }
}