import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
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
    app.useWebSocketAdapter(new (require('@nestjs/platform-socket.io').IoAdapter)(app));
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
    // Nettoyer les listeners après chaque test
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
    const testEmail = 'adherent@gmail.com';

    clientSocket.on('new-demande', (data) => {
      expect(data).toEqual({ email: testEmail });
      done();
    });

    gateway.notifyNewDemande(testEmail);
  });

  it('✅ doit émettre new-demande avec la propriété email', (done) => {
    clientSocket.on('new-demande', (data) => {
      expect(data).toHaveProperty('email');
      done();
    });

    gateway.notifyNewDemande('test@example.com');
  });

  it('✅ doit émettre plusieurs fois avec des emails différents', (done) => {
    const emails = ['premier@gmail.com', 'deuxieme@gmail.com'];
    const received: string[] = [];

    clientSocket.on('new-demande', (data) => {
      received.push(data.email);
      if (received.length === 2) {
        expect(received).toEqual(emails);
        done();
      }
    });

    gateway.notifyNewDemande(emails[0]);
    gateway.notifyNewDemande(emails[1]);
  });
});