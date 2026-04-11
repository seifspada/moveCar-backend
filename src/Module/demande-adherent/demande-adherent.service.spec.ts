import { Test, TestingModule } from '@nestjs/testing';
import { DemandeAdherentService } from './demande-adherent.service';

describe('DemandeService', () => {
  let service: DemandeAdherentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemandeAdherentService],
    }).compile();

    service = module.get<DemandeAdherentService>(DemandeAdherentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
