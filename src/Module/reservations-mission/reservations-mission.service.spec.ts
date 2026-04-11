import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsMissionService } from './reservations-mission.service';

describe('ReservationsMissionService', () => {
  let service: ReservationsMissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationsMissionService],
    }).compile();

    service = module.get<ReservationsMissionService>(ReservationsMissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
