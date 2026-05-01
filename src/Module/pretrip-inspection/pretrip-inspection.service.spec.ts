import { Test, TestingModule } from '@nestjs/testing';
import { PretripInspectionService } from './pretrip-inspection.service';

describe('PretripInspectionService', () => {
  let service: PretripInspectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PretripInspectionService],
    }).compile();

    service = module.get<PretripInspectionService>(PretripInspectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
