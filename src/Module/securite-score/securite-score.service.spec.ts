import { Test, TestingModule } from '@nestjs/testing';
import { SecuriteScoreService } from './securite-score.service';

describe('SecuriteScoreService', () => {
  let service: SecuriteScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecuriteScoreService],
    }).compile();

    service = module.get<SecuriteScoreService>(SecuriteScoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
