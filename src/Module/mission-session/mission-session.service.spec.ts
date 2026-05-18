import { Test, TestingModule } from '@nestjs/testing';
import { MissionSessionService } from './mission-session.service';

describe('MissionSessionService', () => {
  let service: MissionSessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionSessionService],
    }).compile();

    service = module.get<MissionSessionService>(MissionSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
