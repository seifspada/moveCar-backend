import { Test, TestingModule } from '@nestjs/testing';
import { PartenaireService } from './partenaire.service';

describe('PartenaireService', () => {
  let service: PartenaireService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartenaireService],
    }).compile();

    service = module.get<PartenaireService>(PartenaireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
