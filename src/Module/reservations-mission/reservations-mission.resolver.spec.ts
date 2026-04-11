import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsMissionResolver } from './reservations-mission.resolver';
import { ReservationsMissionService } from './reservations-mission.service';

describe('ReservationsMissionResolver', () => {
  let resolver: ReservationsMissionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationsMissionResolver, ReservationsMissionService],
    }).compile();

    resolver = module.get<ReservationsMissionResolver>(ReservationsMissionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
