import { Test, TestingModule } from '@nestjs/testing';
import { DemandePartenaireService } from './demande-partenaire.service';

describe('DemandePartenaireService', () => {
  let service: DemandePartenaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemandePartenaireService],
    }).compile();

    service = module.get<DemandePartenaireService>(DemandePartenaireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
