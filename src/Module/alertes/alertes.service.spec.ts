import { Test, TestingModule } from '@nestjs/testing';
import { TypeAlerte } from '@prisma/client';
import { AlertesService } from './alertes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GeoService } from '../geo/geo.service';
import { NotificationService } from '../notification/notification.service';

describe('AlertesService', () => {
  let service: AlertesService;
  let prisma: any;
  let emailService: jest.Mocked<Partial<EmailService>>;
  let geoService: jest.Mocked<Partial<GeoService>>;
  let notificationService: jest.Mocked<Partial<NotificationService>>;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    prisma = {
      user: { findUnique: jest.fn() },
      alerteGeographique: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      disponibiliteMission: { findFirst: jest.fn() },
      notificationAlerte: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    emailService = {
      sendConfirmationAlerteGeographique: jest.fn(),
      sendConfirmationAlerteTrajet: jest.fn(),
      sendAlerteGeographique: jest.fn(),
      sendAlerteTrajet: jest.fn(),
    };

    geoService = { calculateDistance: jest.fn() };
    notificationService = { sendPushNotification: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: GeoService, useValue: geoService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<AlertesService>(AlertesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('crée une alerte géographique et remplace seulement l’ancienne alerte géographique du user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      name: 'User',
      adherent: { nom: 'Martin', prenom: 'Jean' },
    });
    prisma.alerteGeographique.deleteMany.mockResolvedValue({ count: 1 });
    prisma.alerteGeographique.create.mockResolvedValue({
      id: 'alerte-geo-1',
      userId: 1,
      type: TypeAlerte.GEOGRAPHIQUE,
      villeNom: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      rayon: 50,
    });

    const result = await service.creerAlerteGeographique(
      1,
      'Paris',
      48.8566,
      2.3522,
      50,
      true,
      false,
      undefined,
      '2026-05-16',
      '2026-05-20',
    );

    expect(prisma.alerteGeographique.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, type: TypeAlerte.GEOGRAPHIQUE },
    });
    expect(prisma.alerteGeographique.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        type: TypeAlerte.GEOGRAPHIQUE,
        villeNom: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        rayon: 50,
        actif: true,
        emailActif: true,
        pushActif: false,
        fcmToken: null,
        dateDepart: new Date('2026-05-16'),
        dateDepartMax: new Date('2026-05-20'),
      }),
    });
    expect(emailService.sendConfirmationAlerteGeographique).toHaveBeenCalledWith(
      'user@example.com',
      'Jean',
      'Paris',
      50,
    );
    expect(result.id).toBe('alerte-geo-1');
  });

  it('crée une alerte trajet avec les coordonnées départ/arrivée', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      name: 'User',
      adherent: null,
    });
    prisma.alerteGeographique.deleteMany.mockResolvedValue({ count: 0 });
    prisma.alerteGeographique.create.mockResolvedValue({
      id: 'alerte-trajet-1',
      userId: 1,
      type: TypeAlerte.TRAJET,
      villeDepartNom: 'Paris',
      villeArriveeNom: 'Lyon',
      rayon: 30,
    });

    const result = await service.creerAlerteTrajet(
      1,
      'Paris',
      48.8566,
      2.3522,
      'Lyon',
      45.764,
      4.8357,
      30,
      '2026-05-16',
      '2026-05-20',
      false,
      true,
      'token-1',
    );

    expect(prisma.alerteGeographique.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, type: TypeAlerte.TRAJET },
    });
    expect(prisma.alerteGeographique.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        type: TypeAlerte.TRAJET,
        villeDepartNom: 'Paris',
        latitudeDepart: 48.8566,
        longitudeDepart: 2.3522,
        villeArriveeNom: 'Lyon',
        latitudeArrivee: 45.764,
        longitudeArrivee: 4.8357,
        rayon: 30,
        actif: true,
        pushActif: true,
        fcmToken: 'token-1',
      }),
    });
    expect(emailService.sendConfirmationAlerteTrajet).not.toHaveBeenCalled();
    expect(result.id).toBe('alerte-trajet-1');
  });

  it('enregistre une notification quand une mission matche une alerte géographique active', async () => {
    prisma.disponibiliteMission.findFirst.mockResolvedValue({
      missionId: 'mission-1',
      dateDebut: new Date('2026-05-17T10:00:00.000Z'),
      dateDepartMax: new Date('2026-05-17T12:00:00.000Z'),
    });
    prisma.alerteGeographique.findMany.mockResolvedValue([
      {
        id: 'alerte-geo-1',
        type: TypeAlerte.GEOGRAPHIQUE,
        villeNom: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        rayon: 50,
        emailActif: true,
        pushActif: true,
        fcmToken: 'token-1',
        dateDepart: new Date('2026-05-16T00:00:00.000Z'),
        dateDepartMax: new Date('2026-05-20T00:00:00.000Z'),
        user: {
          email: 'user@example.com',
          name: 'User',
          adherent: { nom: 'Martin', prenom: 'Jean' },
        },
      },
    ]);
    prisma.notificationAlerte.findFirst.mockResolvedValue(null);
    prisma.notificationAlerte.create.mockResolvedValue({ id: 'notification-1' });
    (geoService.calculateDistance as jest.Mock)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(100);

    const mission = {
      id: 'mission-1',
      adresseDepart: { villeNom: 'Paris', latitude: 48.8566, longitude: 2.3522 },
      adresseArrivee: { villeNom: 'Lyon', latitude: 45.764, longitude: 4.8357 },
      calculs: { montantTotal: 120 },
    };

    await service.checkAlertes(mission);

    expect(emailService.sendAlerteGeographique).toHaveBeenCalledWith(
      'user@example.com',
      'Jean',
      'Paris',
      50,
      mission,
    );
    expect(notificationService.sendPushNotification).toHaveBeenCalledWith(
      'token-1',
      'Nouvelle mission disponible',
      'Mission près de Paris',
    );
    expect(prisma.notificationAlerte.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        alerteId: 'alerte-geo-1',
        missionId: 'mission-1',
        emailEnvoye: true,
        pushEnvoye: true,
      }),
    });
  });
});
