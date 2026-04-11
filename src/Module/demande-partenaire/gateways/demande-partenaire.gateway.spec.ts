import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { DemandePartenaireGateway } from './demande-partenaire.gateway';

describe('DemandePartenaireGateway', () => {
  let app: INestApplication;
  let gateway: DemandePartenaireGateway;
  let clientSocket: Socket;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemandePartenaireGateway],
    }).compile();

    app = module.createNestApplication();
    app.useWebSocketAdapter(new (require('@nestjs/platform-socket.io').IoAdapter)(app));
    await app.listen(3002); // port différent pour éviter les conflits

    gateway = module.get<DemandePartenaireGateway>(DemandePartenaireGateway);

    clientSocket = io('http://localhost:3002');

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
    clientSocket.removeAllListeners('new-demande-partenaire');
  });

  // ─── Tests ───────────────────────────────────────────

  it('✅ gateway doit être défini', () => {
    expect(gateway).toBeDefined();
  });

  it('✅ client doit être connecté', () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('✅ doit émettre new-demande-partenaire avec email correct', (done) => {
    const testEmail = 'partenaire@gmail.com';

    clientSocket.on('new-demande-partenaire', (data) => {
      expect(data).toEqual({ email: testEmail });
      done();
    });

    gateway.notifyNewDemande(testEmail);
  });

  it('✅ doit émettre new-demande-partenaire avec la propriété email', (done) => {
    clientSocket.on('new-demande-partenaire', (data) => {
      expect(data).toHaveProperty('email');
      done();
    });

    gateway.notifyNewDemande('test@example.com');
  });

  it('✅ doit émettre plusieurs fois avec des emails différents', (done) => {
    const emails = ['partenaire1@gmail.com', 'partenaire2@gmail.com'];
    const received: string[] = [];

    clientSocket.on('new-demande-partenaire', (data) => {
      received.push(data.email);
      if (received.length === 2) {
        expect(received).toEqual(emails);
        done();
      }
    });

    gateway.notifyNewDemande(emails[0]);
    gateway.notifyNewDemande(emails[1]);
  });

  it('✅ ne doit pas émettre sur le mauvais événement', (done) => {
    let recu = false;

    // Écouter le mauvais événement
    clientSocket.on('new-demande', () => {
      recu = true;
    });

    clientSocket.on('new-demande-partenaire', () => {
      expect(recu).toBe(false); // ← le mauvais event n'a pas été déclenché
      done();
    });

    gateway.notifyNewDemande('test@gmail.com');
  });
});