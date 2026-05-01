import { Test, TestingModule } from '@nestjs/testing';
import { MissionTrackingResolver } from './mission-tracking.resolver';
import { MissionTrackingService } from './mission-tracking.service';

describe('MissionTrackingResolver', () => {
  let resolver: MissionTrackingResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionTrackingResolver, MissionTrackingService],
    }).compile();

    resolver = module.get<MissionTrackingResolver>(MissionTrackingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
