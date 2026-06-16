import { Test, TestingModule } from '@nestjs/testing';
import { ScoresMlService } from './scores-ml.service';

describe('ScoresMlService', () => {
  let service: ScoresMlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoresMlService],
    }).compile();

    service = module.get<ScoresMlService>(ScoresMlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
