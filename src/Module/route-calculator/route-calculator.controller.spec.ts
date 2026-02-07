import { Test, TestingModule } from '@nestjs/testing';
import { RouteCalculatorController } from './route-calculator.controller';
import { RouteCalculatorService } from './route-calculator.service';

describe('RouteCalculatorController', () => {
  let controller: RouteCalculatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteCalculatorController],
      providers: [RouteCalculatorService],
    }).compile();

    controller = module.get<RouteCalculatorController>(RouteCalculatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
