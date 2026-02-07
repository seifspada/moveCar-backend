import { Test, TestingModule } from '@nestjs/testing';
import { RouteCalculatorService } from './route-calculator.service';

describe('RouteCalculatorService', () => {
  let service: RouteCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteCalculatorService],
    }).compile();

    service = module.get<RouteCalculatorService>(RouteCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
