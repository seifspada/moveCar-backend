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

@WebSocketGateway({
  cors: {
    origin: [
      'https://move-car-one.vercel.app',
      /^https:\/\/move-car.*\.vercel\.app$/,
      'http://localhost:3001',
      'http://localhost:3000',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class DemandeAdherentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    console.log('✅ Client connecté:', client.id);

    const demandes = await this.prisma.demandeAdhesion.findMany({
      where: { statut: StatutDemande.EN_ATTENTE },
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

  notifyNewDemande(data: {
    email: string;
    id: number;
    nom: string;
    prenom: string;
    message?: string;
  }) {
    this.server.emit('new-demande', {
      ...data,
      type: 'adherent',
      timestamp: new Date().toISOString(),
    });
  }

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