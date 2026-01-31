import { Test, TestingModule } from '@nestjs/testing';
import { AdherentService } from './adherent.service';

describe('AdherentService', () => {
  let service: AdherentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdherentService],
    }).compile();

    service = module.get<AdherentService>(AdherentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
