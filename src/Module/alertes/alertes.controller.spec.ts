import { Test, TestingModule } from '@nestjs/testing';
import { AlertesController } from './alertes.controller';
import { AlertesService } from './alertes.service';

describe('AlertesController', () => {
  let controller: AlertesController;
  let alertesService: jest.Mocked<Pick<AlertesService, 'creerAlerteGeographique' | 'creerAlerteTrajet'>>;

  beforeEach(async () => {
    alertesService = {
      creerAlerteGeographique: jest.fn(),
      creerAlerteTrajet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertesController],
      providers: [{ provide: AlertesService, useValue: alertesService }],
    }).compile();

    controller = module.get<AlertesController>(AlertesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('crée une alerte géographique depuis le endpoint REST', async () => {
    const alerte = { id: 'alerte-geo-1', villeNom: 'Paris', rayon: 50 };
    alertesService.creerAlerteGeographique.mockResolvedValue(alerte as any);

    const result = await controller.creerAlerteGeographique({
      userId: 1,
      villeNom: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      rayon: 50,
      emailActif: true,
      pushActif: false,
      dateDepart: '2026-05-16',
      dateDepartMax: '2026-05-20',
    });

    expect(alertesService.creerAlerteGeographique).toHaveBeenCalledWith(
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
    expect(result).toEqual({
      success: true,
      message: 'Alerte créée pour Paris (50 km)',
      data: alerte,
    });
  });

  it('crée une alerte trajet depuis le endpoint REST', async () => {
    const alerte = { id: 'alerte-trajet-1', villeDepartNom: 'Paris', villeArriveeNom: 'Lyon' };
    alertesService.creerAlerteTrajet.mockResolvedValue(alerte as any);

    const result = await controller.creerAlerteTrajet({
      userId: 1,
      villeDepartNom: 'Paris',
      latitudeDepart: 48.8566,
      longitudeDepart: 2.3522,
      villeArriveeNom: 'Lyon',
      latitudeArrivee: 45.764,
      longitudeArrivee: 4.8357,
      rayon: 30,
      dateDepart: '2026-05-16',
      dateDepartMax: '2026-05-20',
      emailActif: false,
      pushActif: true,
      fcmToken: 'token-1',
    });

    expect(alertesService.creerAlerteTrajet).toHaveBeenCalledWith(
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
    expect(result).toEqual({
      success: true,
      message: 'Alerte créée pour Paris → Lyon',
      data: alerte,
    });
  });
});
