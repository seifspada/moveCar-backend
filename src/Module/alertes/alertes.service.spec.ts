import { Test, TestingModule } from '@nestjs/testing';
import { AlertesService } from './alertes.service';

describe('AlertesService', () => {
  let service: AlertesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertesService],
    }).compile();

    service = module.get<AlertesService>(AlertesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
