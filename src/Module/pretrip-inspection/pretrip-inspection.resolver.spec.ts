import { Test, TestingModule } from '@nestjs/testing';
import { PretripInspectionResolver } from './pretrip-inspection.resolver';
import { PretripInspectionService } from './pretrip-inspection.service';

describe('PretripInspectionResolver', () => {
  let resolver: PretripInspectionResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PretripInspectionResolver, PretripInspectionService],
    }).compile();

    resolver = module.get<PretripInspectionResolver>(PretripInspectionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
