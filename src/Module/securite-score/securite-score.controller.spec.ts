import { Test, TestingModule } from '@nestjs/testing';
import { SecuriteScoreController } from './securite-score.controller';
import { SecuriteScoreService } from './securite-score.service';

describe('SecuriteScoreController', () => {
  let controller: SecuriteScoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecuriteScoreController],
      providers: [SecuriteScoreService],
    }).compile();

    controller = module.get<SecuriteScoreController>(SecuriteScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
