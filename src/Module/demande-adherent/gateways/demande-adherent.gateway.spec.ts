import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DemandeAdherentGateway } from './demande-adherent.gateway';

describe('DemandeAdherentGateway', () => {
  let app: INestApplication;
  let gateway: DemandeAdherentGateway;
  let clientSocket: Socket;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemandeAdherentGateway],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(3001);

    gateway = module.get<DemandeAdherentGateway>(DemandeAdherentGateway);

    clientSocket = io('http://localhost:3001');

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
    });
  });

  afterAll(async () => {
    clientSocket.disconnect();
    await app.close();
  });

  afterEach(() => {
    clientSocket.removeAllListeners('new-demande');
  });

  // ─── Tests ───────────────────────────────────────────

  it('✅ gateway doit être défini', () => {
    expect(gateway).toBeDefined();
  });

  it('✅ client doit être connecté', () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('✅ doit émettre new-demande avec email correct', (done) => {
    const payload = {
      email: 'adherent@gmail.com',
      id: 1,
      nom: 'Dupont',
      prenom: 'Jean',
      message: 'Nouvelle demande reçue',
    };

    clientSocket.on('new-demande', (data) => {
      expect(data.email).toBe(payload.email);  // ✅ vérifie juste email
      done();
    });

    gateway.notifyNewDemande(payload);  // ✅ objet complet
  });

  it('✅ doit émettre new-demande avec la propriété email', (done) => {
    clientSocket.on('new-demande', (data) => {
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('nom');
      expect(data).toHaveProperty('prenom');
      done();
    });

    gateway.notifyNewDemande({
      email: 'test@example.com',
      id: 2,
      nom: 'Test',
      prenom: 'User',
      message: 'Nouvelle demande reçue',
    });
  });

  it('✅ doit émettre plusieurs fois avec des emails différents', (done) => {
    const payloads = [
      { email: 'premier@gmail.com', id: 1, nom: 'A', prenom: 'B', message: 'msg' },
      { email: 'deuxieme@gmail.com', id: 2, nom: 'C', prenom: 'D', message: 'msg' },
    ];
    const received: string[] = [];

    clientSocket.on('new-demande', (data) => {
      received.push(data.email);
      if (received.length === 2) {
        expect(received).toEqual(payloads.map((p) => p.email));
        done();
      }
    });

    gateway.notifyNewDemande(payloads[0]);
    gateway.notifyNewDemande(payloads[1]);
  });
});