import { Test, TestingModule } from '@nestjs/testing';
import { MissionTrackingService } from './mission-tracking.service';

describe('MissionTrackingService', () => {
  let service: MissionTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionTrackingService],
    }).compile();

    service = module.get<MissionTrackingService>(MissionTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
