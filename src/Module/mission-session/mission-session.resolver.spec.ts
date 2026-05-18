import { Test, TestingModule } from '@nestjs/testing';
import { MissionSessionResolver } from './mission-session.resolver';
import { MissionSessionService } from './mission-session.service';

describe('MissionSessionResolver', () => {
  let resolver: MissionSessionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionSessionResolver, MissionSessionService],
    }).compile();

    resolver = module.get<MissionSessionResolver>(MissionSessionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
