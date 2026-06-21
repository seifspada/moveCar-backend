import { of } from 'rxjs';
import { ScoresMlService } from './scores-ml.service';

describe('ScoresMlService', () => {
  const missionId = 'mission-1';

  const mission = {
    id: missionId,
    noteAgent: null,
    vehicule: { typeVehicule: 'BERLINE' },
    adresseDepart: { latitude: 48.8566, longitude: 2.3522 },
    calculs: null,
    disponibilite: null,
    sessions: [
      {
        id: 'session-1',
        dateDebut: new Date('2026-06-21T10:15:00.000Z'),
        dateFin: new Date('2026-06-21T12:30:00.000Z'),
        reservation: {
          dateDepart: new Date('2026-06-21T10:00:00.000Z'),
          heureDepart: '10:00',
          dateArrivee: new Date('2026-06-21T12:00:00.000Z'),
          heureArrivee: '12:00',
          distanceKm: 120,
          adherent: { dateNaissance: new Date('1990-01-01T00:00:00.000Z') },
        },
      },
    ],
  };

  it('saves noteAgent and score fields together after a valid ML response', async () => {
    const prisma = {
      mission: {
        findUnique: jest.fn().mockResolvedValue(mission),
        update: jest.fn().mockResolvedValue({ id: missionId }),
      },
    };
    const httpService = {
      get: jest.fn().mockReturnValue(of({ data: { current_weather: { weathercode: 0 } } })),
      post: jest.fn().mockReturnValue(
        of({
          data: {
            score_final: 82.75,
            predicted_label: 'Excellent',
          },
        }),
      ),
    };
    const service = new ScoresMlService(httpService as any, prisma as any);

    await service.calculateScoreAndSave(missionId, 4.5);

    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/predict'),
      expect.objectContaining({ delivery_person_ratings: 4.5 }),
      expect.any(Object),
    );
    expect(prisma.mission.update).toHaveBeenCalledWith({
      where: { id: missionId },
      data: expect.objectContaining({
        noteAgent: 4.5,
        scoreLogistique: 82.75,
        scorePredictedLabel: 'Excellent',
      }),
    });
    expect(prisma.mission.update.mock.calls[0][0].data.scoreCalculatedAt).toBeInstanceOf(Date);
  });
});
